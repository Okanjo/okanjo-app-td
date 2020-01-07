# Okanjo TreasureData Service

[![Build Status](https://travis-ci.org/Okanjo/okanjo-app-td.svg?branch=master)](https://travis-ci.org/Okanjo/okanjo-app-td) [![Coverage Status](https://coveralls.io/repos/github/Okanjo/okanjo-app-td/badge.svg?branch=master)](https://coveralls.io/github/Okanjo/okanjo-app-td?branch=master)

Service for interfacing with TreasureData for the Okanjo App ecosystem.

## Installing

Add to your project like so: 

```sh
npm install okanjo-app-td
```

Note: requires the [`okanjo-app`](https://github.com/okanjo/okanjo-app) module.


# `TreasureDataService`

Service for working with TreasureData queries. 

```js
const TreasureDataService = require('okanjo-app-td');
```

## Properties
* `service.app` – (read-only) The OkanjoApp instance provided when constructed
* `service.config` – (read-only) The service configuration provided when constructed
* `service.tdClient` – (read-only) The underlying [TreasureData Node.js Client](https://github.com/treasure-data/td-client-node)  

## Methods

### `new TreasureDataService(app, config)`

Creates a new service instance.

* `app` – The OkanjoApp instance to bind to
* `config` – (Required) The service configuration object.
  * `config.apiKey` – (Required) The TD API key to pass to the underlying TD client.
  * `config.jobStatusPollInterval` – (Optional) Job status polling interval (in ms). 

### `service.query(db, query, options={})`
Executes a new query.

- `db` - The name of the database to query against
- `query` – The SQL query body
- `options` - (optional) Query options. Defaults to `{}`
  - `options.hive` – (optional) Whether to run the query using Hive (`true`) or Presto (`false`). Defaults to `false`.
  - `options.*` - Passed to the underlying `prestoQuery` or `hiveQuery` TD client call.
  
Returns `Promise<array>`, where each row is mapped to an object using the output column names as keys.


### `service.namedQuery(name, options={})`
Executes a new query.

- `db` - The name of the database to query against
- `query` – The SQL query body
- `options` - (optional) Query options. Defaults to `{}`
  - `options.scheduledTime` – (optional) The scheduled time the job will execute using. Defaults to `Date.now`.
 
Returns `Promise<array>`, where each row is mapped to an object using the output column names as keys.


### `service.startPrestoQueryJob(db, query, options={})`
Starts a new presto query job.

- `db` - The name of the database to query against
- `query` – The SQL query body
- `options` - (optional) Query options. Defaults to `{}`

Returns `Promise<response>`, where response is the TD JSON response.  

### `service.startHiveQueryJob(db, query, options={})`
Starts a new hive query job.

- `db` - The name of the database to query against
- `query` – The SQL query body
- `options` - (optional) Query options. Defaults to `{}`

Returns `Promise<response>`, where response is the TD JSON response.

### `service.getJobStatus(jobId)`
Gets the status of a job.

- `jobId` – Query job id

Returns `Promise<response>`, where response is the TD JSON response.

### `service.waitForJobCompletion(jobId)`
Resolves once the job has completed.

- `jobId` – Query job id

Returns `Promise<response>`, where response is the TD JSON response.

- Resolves when the job status is `success`.
- Rejects if the job status is `error` or `killed`.

### `service.getJobSchema(jobId)`
Gets the output schema of a job.

- `jobId` – Query job id

Returns `Promise<schema>`, where schema is the parsed column schema.

### `service.getJobResults(jobId, options = 'json')`
Gets the output row data of a job.

- `jobId` – Query job id

Returns `Promise<rows>`

### `service.mapSchemaToJobData(schema, rows)`
Returns a mapped array of row objects whose keys are the query column names.

- `schema` - Job output schema
- `rows` - Job output rows

Returns an `Array` of mapped row objects. 
 

## Events

This class does not emit events.


## Extending and Contributing 

Our goal is quality-driven development. Please ensure that 100% of the code is covered with testing.

Before contributing pull requests, please ensure that changes are covered with unit tests, and that all are passing. 

### Testing

To run unit tests and code coverage:

```sh
npm run report
```

This will perform:
* Unit tests
* Code coverage report
* Code linting

Sometimes, that's overkill to quickly test a quick change. To run just the unit tests:
 
```sh
npm test
```

or if you have mocha installed globally, you may run `mocha test` instead.
