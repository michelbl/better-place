const express = require('express');
const esClient = require('../elasticsearch_client'); 
const config = require('../config');
const { extractFrom, getDay, generateMatchQueriesFromRequest } = require('../utils');


const router = express.Router();

const MAX_NB_HITS = 50;


router.get('/', async function(req, res, next) {
  try {
    let hitsData;
    let nbHits;

    const queryString = req.query.q;
    const reference = req.query.reference;
    const organisme = req.query.organisme;
    const intitule = req.query.intitule;
    const matchQueries = generateMatchQueriesFromRequest(req.query);
    const from = extractFrom(req);
    const validQueryString = matchQueries.length !== 0;
    if (!validQueryString) {
      hitsData = [];
      nbHits = 0;
    } else {

      const esCountResponse = await esClient.count({
        index: config.elasticsearch.index_name,
        body: {
          query: {
            bool: {
              must: matchQueries
            }
          },
        },
      });
      nbHits = esCountResponse.body.count;

      // generate a search object for elasticSearch on multiple fields
      const esResponse = await esClient.search({
        index: config.elasticsearch.index_name,
        from,
        size: MAX_NB_HITS,
        body: {
          _source: {
            excludes: [ 'content' ],
          },
          query: {
            bool: {
              must: matchQueries
            }
          },
          highlight : {
            encoder: 'html',
            fields : {
              content : {},
              intitule : {},
            },
            fragment_size: 100, // instead of 150
            number_of_fragments: 3, // instead of 5
            pre_tags: ['<b>'], // instead of em
            post_tags: ['</b>'],
          },
        },
      });

      const hits = esResponse.body.hits.hits;
      hitsData = hits.map((hit, index) => ({
        index: index + from + 1,
        href: `/dce/${hit._source.annonce_id}`,
        annonce_id: hit._source.annonce_id,
        org_acronym: hit._source.org_acronym,
        intitule: hit.highlight && hit.highlight.intitule ? hit.highlight.intitule : hit._source.intitule,
        fetch_datetime: getDay(hit._source.fetch_datetime),
        highlight: hit.highlight && hit.highlight.content ? hit.highlight.content.join(' … ') : '',
        }));
    }

    const getPagination = function(queryString, from, pageSize, nbHits) {
      const currentPageIndex = Math.round(from / pageSize) + 1;
      const previousPageIndex = currentPageIndex - 1;
      const isLastPage = nbHits <= (currentPageIndex * pageSize);
      const nextPageIndex = !isLastPage && (currentPageIndex + 1);
    
      const firstPageHref = `/search?q=${queryString}`;
      const previousPageHref = `/search?q=${queryString}&from=${(previousPageIndex - 1) * pageSize}`;
      const nextPageHref = `/search?q=${queryString}&from=${(nextPageIndex - 1) * pageSize}`;
    
      return {
        isLastPage,
        currentPageIndex, previousPageIndex, nextPageIndex,
        firstPageHref, previousPageHref, nextPageHref,
      }
    }

    const pagination = validQueryString && getPagination(queryString, from, MAX_NB_HITS, nbHits);


    res.render('search', {
      validQueryString, queryString, reference, organisme, intitule,
      nbHits,
      nbHitsPlural: nbHits > 1,
      pagination,
      hitsData,
    });

  } catch (error) {
    return next(error);
  }
});

module.exports = router;
