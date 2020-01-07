"use strict";

const should = require('should');

describe('TreasureDataService', () => {

    const OkanjoApp = require('okanjo-app');
    const TreasureDataService = require('../TreasureDataService');
    const MockAPI = require('./MockAPI');

    const config = {
        td: {
            apiKey: '12345'
        }
    };

    const app = new OkanjoApp(config);

    describe('construction', () => {

        it('should construct with default options', () => {

            let service = new TreasureDataService(app, app.config.td);
            should(service).be.ok();
            service.config.jobStatusPollInterval.should.be.exactly(5000);

        });

        it('should construct with custom options', () => {

            let service = new TreasureDataService(app, {
                apiKey: '123456',
                jobStatusPollInterval: 1000
            });
            should(service).be.ok();
            service.config.jobStatusPollInterval.should.be.exactly(1000);

        });

    });

    describe('query', () => {

        it('should execute a presto query', async () => {

            let service = new TreasureDataService(app, app.config.td);

            const scope = MockAPI.requestTDRunQuerySuccess({ db: 'my_db', engine: 'presto' });
            MockAPI.requestTDJobStatusSuccess({ scope, job: '12345' });
            MockAPI.requestTDShowJobSuccess({ scope, job: '12345' });
            MockAPI.requestTDJobResultSuccess({ scope, job: '12345'  });

            let res = await service.query('my_db', 'SELECT name, views, clicks FROM my_table');

            should(res).be.ok();

            res.length.should.be.exactly(1);
            res.should.deepEqual([ { name: 'page 1', views: 100, clicks: 10 } ]);

        });

        it('should execute a hive query', async () => {

            let service = new TreasureDataService(app, app.config.td);

            const scope = MockAPI.requestTDRunQuerySuccess({ db: 'my_db', engine: 'hive' });
            MockAPI.requestTDJobStatusSuccess({ scope, job: '12345' });
            MockAPI.requestTDShowJobSuccess({ scope, job: '12345' });
            MockAPI.requestTDJobResultSuccess({ scope, job: '12345'  });

            let res = await service.query('my_db', 'SELECT name, views, clicks FROM my_table', { hive: true });

            should(res).be.ok();

            res.length.should.be.exactly(1);
            res.should.deepEqual([ { name: 'page 1', views: 100, clicks: 10 } ]);

        });

    });

    describe('namedQuery', () => {

        it('should execute a query by name', async () => {

            let service = new TreasureDataService(app, app.config.td);

            const scope = MockAPI.requestTDRunScheduleSuccess({});
            MockAPI.requestTDJobStatusSuccess({ scope, job: '123456' });
            MockAPI.requestTDShowJobSuccess({ scope, job: '123456' });
            MockAPI.requestTDJobResultSuccess({ scope, job: '123456'  });

            let res = await service.namedQuery('my_saved_query');
            should(res).be.ok();

            res.length.should.be.exactly(1);
            res.should.deepEqual([ { name: 'page 1', views: 100, clicks: 10 } ]);
        });


    });

    describe('startPrestoQueryJob', () => {

        it('should be happy with default options', async () => {

            let service = new TreasureDataService(app, app.config.td);

            /*const scope = */ MockAPI.requestTDRunQuerySuccess({ db: 'my_db', engine: 'presto' });

            let res = await service.startPrestoQueryJob('my_db', 'SELECT name, views, clicks FROM my_table');

            should(res).be.ok();

        });

    });

    describe('startHiveQueryJob', () => {

        it('should be happy with default options', async () => {

            let service = new TreasureDataService(app, app.config.td);

            /*const scope = */ MockAPI.requestTDRunQuerySuccess({ db: 'my_db', engine: 'hive' });

            let res = await service.startHiveQueryJob('my_db', 'SELECT name, views, clicks FROM my_table');

            should(res).be.ok();

        });

    });

    describe('waitForJobCompletion', () => {

        it('should poll a second time if not ready', async () => {

            // fudge delay to 10ms cuz we like fast unit tests
            let service = new TreasureDataService(app, { apiKey: '12345', jobStatusPollInterval: 10 });

            const scope = MockAPI.requestTDJobStatusSuccess({ status: 'running' });
            MockAPI.requestTDJobStatusSuccess({ scope, status: 'success' });

            let res = await service.waitForJobCompletion('123456');
            should(res).be.ok();

        });

        it('should reject if the job failed', async () => {

            // fudge delay to 10ms cuz we like fast unit tests
            let service = new TreasureDataService(app, { apiKey: '12345', jobStatusPollInterval: 10 });

            MockAPI.requestTDJobStatusSuccess({ status: 'error' });

            await service.waitForJobCompletion('123456').should.be.rejected();
        });

    });

    describe('getJobResults', () => {

        it('should handle an empty result set', async () => {

            let service = new TreasureDataService(app, { apiKey: '12345' });

            MockAPI.requestTDJobResultSuccess({ job: '123456', data: '' });

            let res = await service.getJobResults('123456');
            should(res).be.ok();
            res.should.be.an.Array().and.be.empty();

        });

    });

});