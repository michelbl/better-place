const config = require('./config');
const esClient = require('./elasticsearch_client'); 


function extractFrom(req) {
  return parseInt(req.query.from) || 0;
}

function getDay(datetimeISOString) {
  return datetimeISOString.split('T')[0];
}

async function getDocCount() {
  const esCountResponse = await esClient.count({
    index: config.elasticsearch.index_name,
  });
  return esCountResponse.count;
}

module.exports = {
  extractFrom,
  getDay,
  getDocCount,
}
