const express = require('express');
const esClient = require('../elasticsearch_client'); 
const config = require('../config');

const router = express.Router();


router.get('/', async function(req, res, next) {
  try {
    let hitsIds;

    const queryString = req.query.q;
    if ((typeof queryString) !== 'string' || queryString.length === 0) {
      hitsIds = [];
    } else {

      const esResponse = await esClient.search({
        index: config.elasticsearch.index_name,
        type: config.elasticsearch.document_type,
        body: {
          _source: false,
          query: {
            match: {
              content: queryString,
            },
          },
        },
      });
      
      const hits = esResponse.hits.hits;
      hitsIds = hits.map(hit => hit._id);
    }

    res.render('search', { hitsIds });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
