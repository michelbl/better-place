const elasticsearch = require('elasticsearch');
const config = require('./config');

const client = new elasticsearch.Client(config.elasticsearch.initOptions);

module.exports = client;
