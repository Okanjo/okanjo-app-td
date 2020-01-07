"use strict";

const Nock = require('nock');

exports.reset = () => {
    Nock.cleanAll();
};

exports.requestTDRunQuery = ({ request={}, response={}, scope, engine, db }) => {
    return (scope || Nock(/api\.treasuredata\.com/))
        .post(`/v3/job/issue/${engine}/${db}`, request.body)
        .reply(response.code, response.body)
    ;
};

exports.requestTDRunQuerySuccess = ({ scope, request, data, engine, db }) => {
    return exports.requestTDRunQuery({
        engine,
        db,
        scope,
        request,
        response: {
            code: 200,
            body: data || {
                job: '12345',
                database: 'my_db',
                job_id: '12345'
            }
        }
    });
};


exports.requestTDRunSchedule = ({ request={}, response={}, scope }) => {
    return (scope || Nock(/api\.treasuredata\.com/))
        .filteringPath(path => path.replace(/\/v3\/schedule\/run\/.*\/.*/, '/v3/schedule/run/{name}/{time}'))
        .post(`/v3/schedule/run/{name}/{time}`, request.body)
        .reply(response.code, response.body)
    ;
};

exports.requestTDRunScheduleSuccess = ({ scope, request, data }) => {
    return exports.requestTDRunSchedule({
        scope,
        request,
        response: {
            code: 200,
            body: data || {
                jobs: [
                    { job_id: "123456", type: 'presto', scheduled_at: '2015-12-01 00:00:00 UTC' }
                ]
            }
        }
    });
};

exports.requestTDJobStatus = ({ job, request={}, response={}, scope }) => {
    return (scope || Nock(/api\.treasuredata\.com/))
        .get(`/v3/job/status/${job}`, request.body)
        .reply(response.code, response.body)
    ;
};

exports.requestTDJobStatusSuccess = ({ job="123456", scope, request, status='success', data }) => {
    return exports.requestTDJobStatus({
        job,
        scope,
        request,
        response: {
            code: 200,
            body: data || {
                status,
                cpu_time: null,
                result_size: 137,
                duration: 0,
                job_id: '123456',
                created_at: '2019-10-22 15:06:59 UTC',
                updated_at: '2019-10-22 15:06:59 UTC',
                start_at: '2019-10-22 15:06:59 UTC',
                end_at: '2019-10-22 15:06:59 UTC',
                num_records: 1
            }
        }
    });
};

exports.requestTDShowJob = ({ job, request={}, response={}, scope }) => {
    return (scope || Nock(/api\.treasuredata\.com/))
        .get(`/v3/job/show/${job}`, request.body)
        .reply(response.code, response.body)
    ;
};

exports.requestTDShowJobSuccess = ({ job="123456", scope, request, data }) => {
    return exports.requestTDShowJob({
        job,
        scope,
        request,
        response: {
            code: 200,
            body: data || {
                query: 'query',
                type: 'presto',
                priority: 0,
                retry_limit: 0,
                duration: 0,
                status: 'success',
                cpu_time: null,
                result_size: 137,
                job_id: job,
                created_at: '2019-10-22 15:06:59 UTC',
                updated_at: '2019-10-22 15:06:59 UTC',
                start_at: '2019-10-22 15:06:59 UTC',
                end_at: '2019-10-22 15:06:59 UTC',
                num_records: 1,
                database: 'my_database',
                user_name: 'Jon Appleseed',
                result: '',
                url: 'https://console.treasuredata.com/app/jobs/123456',
                hive_result_schema: '[["name", "varchar(19)"], ["views", "integer"], ["clicks", "integer"]]',
                organization: null,
                linked_result_export_job_id: null,
                result_export_target_job_id: null,
                debug: {
                    cmdout: 'blah blah blah',
                    stderr: null
                }
            }
        }
    })
};

exports.requestTDJobResult = ({ job, request={}, response={}, scope }) => {
    return (scope || Nock(/api\.treasuredata\.com/))
        .get(`/v3/job/result/${job}?format=json`, request.body)
        .reply(response.code, response.body)
        ;
};

exports.requestTDJobResultSuccess = ({ job="123456", scope, request, data }) => {
    return exports.requestTDJobResult({
        job,
        scope,
        request,
        response: {
            code: 200,
            body: typeof data !== "undefined" ? data : '["page 1",100,10]\n'
        }
    })
};

