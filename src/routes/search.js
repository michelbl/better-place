const express = require('express');
const esClient = require('../elasticsearch_client'); 
const config = require('../config');

const router = express.Router();

const MAX_NB_HITS = 50;


router.get('/', async function(req, res, next) {
  try {
    let hitsData;

    const queryString = req.query.q;
    if ((typeof queryString) !== 'string' || queryString.length === 0) {
      hitsData = [];
    } else {

      const esResponse = await esClient.search({
        index: config.elasticsearch.index_name,
        type: config.elasticsearch.document_type,
        size: MAX_NB_HITS,
        body: {
          _source: {
            excludes: [ 'content' ],
          },
          query: {
            match: {
              content: queryString,
            },
          },
          highlight : {
            fields : {
              content : {},
            },
          },
        },
      });
      
      const hits = esResponse.hits.hits;
      hitsData = hits.map(hit => ({
        href: `/dce/${hit._source.annonce_id}-${hit._source.org_acronym}`,
        annonce_id: hit._source.annonce_id,
        org_acronym: hit._source.org_acronym,
        intitule: hit._source.intitule,
        highlight: hit.highlight.content.join(' … '),
        }));
    }

    res.render('search', { hitsData });

  } catch (error) {
    return next(error);
  }
});

module.exports = router;
