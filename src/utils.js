const config = require('./config');
const esClient = require('./elasticsearch_client'); 


function extractFrom(req) {
  return parseInt(req.query.from) || 0;
}

function isEmpty(stringVar){
  return stringVar === '' || stringVar === undefined || stringVar === null;
}

function isAuthorizedQueryParam(queryParam){
  return [ 'q', 'reference', 'organisme', 'intitule'].includes(queryParam);
}
/**
 * 
 * @param {*} req 
 * @param {*} query 
 */
function generateMatchQueriesFromRequest(expressQuery){
  const matchQueries = [];
  for (let key in expressQuery) {
    if (key !== 'from' && isAuthorizedQueryParam(key) && typeof expressQuery[key] == 'string' && !isEmpty(expressQuery[key])) {
      const propMatch = key === 'q' ? 'content' : key;
      matchQueries.push({
        match: {
          [propMatch]: expressQuery[key]
        }
      });
    }
  }
  return matchQueries;

}

function getDay(datetimeISOString) {
  return datetimeISOString.split('T')[0];
}

async function getDocCount() {
  const esCountResponse = await esClient.count({
    index: config.elasticsearch.index_name,
  });
  return esCountResponse.body.count;
}

module.exports = {
  extractFrom,
  getDay,
  getDocCount,
  generateMatchQueriesFromRequest
}
