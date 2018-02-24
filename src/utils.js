const config = require('./config');
const esClient = require('./elasticsearch_client'); 


function buildDceId(annonceId, orgAcronym) {
  return `${annonceId}-${orgAcronym}`;
}

async function getDocCount() {
  const esCountResponse = await esClient.count({
    index: config.elasticsearch.index_name,
  });
  return esCountResponse.count;
}

module.exports = {
  buildDceId,
  getDocCount,
}
