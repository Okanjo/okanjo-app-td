"use strict";

const TDClient = require('td');
const QueryString = require('querystring');

/**
 * Treasure Data Service Wrapper
 */
class TreasureDataService {

    /**
     * Creates a new instance
     * @param app
     * @param config
     */
    constructor(app, config) {
        this.app = app;
        this.config = config;

        // Defaults
        this.config.jobStatusPollInterval = this.config.jobStatusPollInterval || 5000;

        this.tdClient = new TDClient(config.apiKey);
    }

    /**
     * Starts a new presto query job
     * @param db
     * @param query
     * @param options
     * @return {Promise<*>}
     */
    startPrestoQueryJob(db, query, options={}) {
        return new Promise((resolve, reject) => {
            this.tdClient.prestoQuery(db, query, options, (err, res) => {
                /* istanbul ignore if: out of scope */
                if (err) {
                    this.app.report('TreasureData presto query failed!', err, { db, query, options });
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Starts a new hive query job
     * @param db
     * @param query
     * @param options
     * @return {Promise<*>}
     */
    startHiveQueryJob(db, query, options={}) {
        return new Promise((resolve, reject) => {
            this.tdClient.hiveQuery(db, query, options, (err, res) => {
                /* istanbul ignore if: out of scope */
                if (err) {
                    this.app.report('TreasureData hive query failed!', err, { db, query, options });
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Gets the status of a TreasureData job
     * @param jobId
     * @return {Promise<*>}
     */
    getJobStatus(jobId) {
        return new Promise((resolve, reject) => {
            this.tdClient._request("/v3/job/status/" + QueryString.escape(jobId), {
                json: true
            }, (err, body) => {
                /* istanbul ignore if: out of scope */
                if (err) {
                    this.app.report('Failed to fetch job status', err, { jobId, body });
                    reject(err);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * Callback when the job has completed
     * @param jobId
     * @return {Promise<*>}
     */
    waitForJobCompletion(jobId) {
        return this.getJobStatus(jobId)
            .then(res => {

                /* istanbul ignore else: out of scope */
                if (res.status === 'queued' ||
                    res.status === 'booting' ||
                    res.status === 'running')
                {
                    // Wait and check again
                    return new Promise(resolve => {
                        setTimeout(resolve, this.config.jobStatusPollInterval);
                    })
                    .then(() => {
                        return this.waitForJobCompletion(jobId);
                    })
                }

                if (res.status === 'success') {
                    return res;
                }

                // res.status === error, killed
                return Promise.reject(new Error('Job failed or was killed'));
            })
        ;
    }

    /**
     * Gets the output schema (column types) for the given job
     * @param jobId
     * @return {Promise<*>}
     */
    getJobSchema(jobId) {
        return new Promise((resolve, reject) => {

            this.tdClient.showJob(jobId, (err, res) => {

                /* istanbul ignore if: out of scope */
                if (err || !res) {
                    this.app.report('Failed to pull job information', err, { jobId, res });
                    return reject(err);
                }

                /* istanbul ignore if: out of scope */
                if (!res.hive_result_schema) {
                    this.app.report('Job result schema is missing', err, { jobId, res });
                    return reject(err);
                }

                let schema;
                try {
                    schema = JSON.parse(res.hive_result_schema);
                } catch(e) /* istanbul ignore next: out of scope */ {
                    this.app.report('Failed to parse TD job result schema', e, { jobId, res });
                    return reject(e);
                }

                return resolve(schema);
            });
        });
    }

    /**
     * Fetches the output rows from the job
     * @param jobId
     * @param options
     * @return {Promise<*>}
     */
    getJobResults(jobId, options = 'json') {
        return new Promise((resolve, reject) => {
            this.tdClient.jobResult(jobId, options, (err, res) => {

                /* istanbul ignore if: out of scope */
                if (err) {
                    this.app.report('Failed to pull TD job results', err, { jobId, options, res });
                    return reject(err);
                }

                // If the job did not produce a result, then res will be an empty object
                if (typeof res !== 'string' || !res.length) {
                    return resolve([]); // empty result set
                }

                let results;
                try {
                    // results are formatted as
                    // - one row per line (\n separated)
                    // - each row is a JSON array
                    // so, we need to convert newline chars to commas, and wrap with an array bracket
                    // alternatively, we could split the result on newline and parse each line individually, but that seems more cpu intensive #speculation
                    res = res.trim();
                    res = "[" + res.replace(/\n/g, ',') + "]";
                    results = JSON.parse(res);
                } catch (e) /* istanbul ignore next: out of scope */ {
                    this.app.report('Failed to parse TD results', e, { jobId, options, res });
                    return reject(e);
                }

                return resolve(results);
            });
        });
    }

    // noinspection JSMethodCanBeStatic
    /**
     * Converts each row into an object using the column schema
     * @param schema
     * @param rows
     * @return {[*]}
     */
    mapSchemaToJobData (schema, rows) {
        return rows.map(row => {
            const output = {};
            schema.forEach((col, i) => {
                output[col[0]] = row[i];
            });
            return output;
        });
    }

    /**
     * Runs a TreasureData query
     * @param {string} db
     * @param {string} query
     * @param {*} [options] - Optional query options
     * @return {Promise<*[]>}
     */
    query(db, query, options = {}) {

        let jobId = null;
        let schema = null;
        let results = null;

        let engine = options.hive ? this.startHiveQueryJob : this.startPrestoQueryJob;
        delete options.hive;

        // Start the job
        return engine.call(this, db, query, options)
            .then(res => {
                jobId = res.job_id;

                // Wait for it to finish
                return this.waitForJobCompletion(jobId);
            })
            .then(() => {
                // Figure out the output column mappings
                return this.getJobSchema(jobId);
            })
            .then(res => {
                schema = res;

                // Fetch the results of the job
                return this.getJobResults(jobId);
            })
            .then(res => {
                results = res;

                // Map the results to the schema format
                return this.mapSchemaToJobData(schema, results);
            })
        ;
    }

    /**
     * Runs a stored query on TD by the given name
     * @param name
     * @param options
     * @return {Promise<*[]>}
     */
    namedQuery(name, options= {}) {

        let jobId = null;
        let schema = null;
        let results = null;

        return new Promise((resolve, reject) => {

            // Execute job with given scheduled time (or now if not provided)
            this.tdClient.runSchedule(name, options.scheduledTime || (new Date()).toISOString(), (err, res) => {
                /* istanbul ignore if: out of scope */
                if (err) {
                    this.app.report('Blew up executing scheduled query!', err, { name, options, res });
                    return reject(err);
                }

                jobId = res.jobs[0].job_id;
                return resolve(jobId);
            });
        })
            .then(jobId => {
                // Wait for it to finish
                return this.waitForJobCompletion(jobId);
            })
            .then(() => {
                // Figure out the output column mappings
                return this.getJobSchema(jobId);
            })
            .then(res => {
                schema = res;

                // Fetch the results of the job
                return this.getJobResults(jobId);
            })
            .then(res => {
                results = res;

                // Map the results to the schema format
                return this.mapSchemaToJobData(schema, results);
            })
        ;
    }
}

module.exports = TreasureDataService;