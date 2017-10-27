const config = require('./config');

// Loading and initializing the library
const pgp = require('pg-promise')(config.postgresql.initOptions);

// Creating a new database instance from the connection details
const db = pgp(config.postgresql.details);

module.exports = db;
