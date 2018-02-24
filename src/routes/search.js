const express = require('express');
const esClient = require('../elasticsearch_client'); 
const config = require('../config');

const router = express.Router();

const MAX_NB_HITS = 50;


router.get('/', async function(req, res, next) {
  try {
    let hitsData;
    let nbHits;

    const queryString = req.query.q;
    const from = req.query.from || 0;
    const validQueryString = ((typeof queryString) === 'string') && (queryString.length !== 0);
    if (!validQueryString) {
      hitsData = [];
      nbHits = 0;
    } else {

      const esCountResponse = await esClient.count({
        index: config.elasticsearch.index_name,
        type: config.elasticsearch.document_type,
        body: {
          query: {
            match: {
              content: queryString,
            },
          },
        },
      });
      nbHits = esCountResponse.count;

      const esResponse = await esClient.search({
        index: config.elasticsearch.index_name,
        type: config.elasticsearch.document_type,
        from,
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
        fetch_datetime: hit._source.fetch_datetime,
        highlight: hit.highlight.content.join(' … '),
        }));
    }

    const getPagination = function(queryString, from, pageSize, nbHits) {
      const currentPageIndex = Math.round(from / MAX_NB_HITS);
      const previousPageIndex = (currentPageIndex > 0) && (currentPageIndex - 1);
      const isLastPage = nbHits <= ((currentPageIndex + 1) * pageSize);
      const nextPageIndex = !isLastPage && (currentPageIndex + 1);

      const firstPageHref = `/search?q=${queryString}`;
      const previousPageHref = `/search?q=${queryString}&from=${previousPageIndex * MAX_NB_HITS}`;
      const nextPageHref = `/search?q=${queryString}&from=${nextPageIndex * MAX_NB_HITS}`;

      return {
        isLastPage,
        currentPageIndex, previousPageIndex, nextPageIndex,
        firstPageHref, previousPageHref, nextPageHref,
      }
    }

    const pagination = validQueryString && getPagination(queryString, from, MAX_NB_HITS,  nbHits);

    res.render('search', { validQueryString, queryString, nbHits, pagination, hitsData });

  } catch (error) {
    return next(error);
  }
});

module.exports = router;
