const express = require('express');
const config = require('../config');
const esClient = require('../elasticsearch_client'); 

const NB_LAST = 50;


const router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const from = req.query.from || 0;


    const esCountResponse = await esClient.count({
      index: config.elasticsearch.index_name,
    });
    const docCount = esCountResponse.count;


    const esLastDceResponse = await esClient.search({
      index: config.elasticsearch.index_name,
      type: config.elasticsearch.document_type,
      size: NB_LAST,
      from,
      body: {
        _source: {
          excludes: [ 'content' ],
        },
        query: {
          match_all: {},
        },
        sort: {
          fetch_datetime: {
            order: 'desc',
          },
        },
      },
    });

    const hits = esLastDceResponse.hits.hits;
    const lastDceData = hits.map(hit => ({
      href: `/dce/${hit._source.annonce_id}-${hit._source.org_acronym}`,
      annonce_id: hit._source.annonce_id,
      org_acronym: hit._source.org_acronym,
      intitule: hit._source.intitule,
      fetch_datetime: hit._source.fetch_datetime,
      }));


    const getPagination = function(from, pageSize, nbHits) {
      const currentPageIndex = Math.round(from / pageSize);
      const previousPageIndex = (currentPageIndex > 0) && (currentPageIndex - 1);
      const isLastPage = nbHits <= ((currentPageIndex + 1) * pageSize);
      const nextPageIndex = !isLastPage && (currentPageIndex + 1);
    
      const firstPageHref = `/all`;
      const previousPageHref = `/all?from=${previousPageIndex * pageSize}`;
      const nextPageHref = `/all?&from=${nextPageIndex * pageSize}`;
    
      return {
        isLastPage,
        currentPageIndex, previousPageIndex, nextPageIndex,
        firstPageHref, previousPageHref, nextPageHref,
      }
    }

    const pagination = getPagination(from, NB_LAST, docCount);


    res.render('all', { pagination, docCount, lastDceData });
  } catch(e) {
    return next(e);
  }
});

module.exports = router;
