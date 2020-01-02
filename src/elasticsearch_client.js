const { Client } = require('@elastic/elasticsearch');
const config = require('./config');

const client = new Client(config.elasticsearch.initOptions);

module.exports = client;
