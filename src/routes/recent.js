const express = require('express');
const config = require('../config');
const esClient = require('../elasticsearch_client'); 
const { getDocCount, extractFrom, getDay } = require('../utils');

const NB_LAST = 50;


const router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const from = extractFrom(req);


    const docCount = await getDocCount();


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
    const lastDceData = hits.map((hit, index) => ({
      index: index + from + 1,
      href: `/dce/${hit._source.annonce_id}`,
      annonce_id: hit._source.annonce_id,
      org_acronym: hit._source.org_acronym,
      intitule: hit._source.intitule,
      fetch_datetime: getDay(hit._source.fetch_datetime),
      }));


    const getPagination = function(from, pageSize, nbHits) {
      const currentPageIndex = Math.round(from / pageSize) + 1;
      const previousPageIndex = currentPageIndex - 1;
      const isLastPage = nbHits <= (currentPageIndex  * pageSize);
      const nextPageIndex = !isLastPage && (currentPageIndex + 1);
      const lastPageIndex = Math.ceil(nbHits / pageSize);
    
      const firstPageHref = `/recent`;
      const previousPageHref = `/recent?from=${(previousPageIndex - 1) * pageSize}`;
      const nextPageHref = `/recent?&from=${(nextPageIndex - 1) * pageSize}`;
      const lastPageHref = `/recent?&from=${(lastPageIndex - 1) * pageSize}`;  

      return {
        isLastPage,
        currentPageIndex, previousPageIndex, nextPageIndex, lastPageIndex,
        firstPageHref, previousPageHref, nextPageHref, lastPageHref,
      }
    }

    const pagination = getPagination(from, NB_LAST, docCount);


    res.render('recent', { pagination, docCount, lastDceData });
  } catch(e) {
    return next(e);
  }
});

module.exports = router;
