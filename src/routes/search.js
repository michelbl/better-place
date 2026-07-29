const express = require('express');
const esClient = require('../elasticsearch_client');
const config = require('../config');
const {
  extractFrom,
  getDay,
  buildSearchQuery,
  buildSort,
  extractSearchForm,
  buildSearchPath,
  getSearchTooltips,
} = require('../utils');


const router = express.Router();

const MAX_NB_HITS = 50;


router.get('/', async function(req, res, next) {
  try {
    let hitsData;
    let nbHits;

    const form = extractSearchForm(req.query);
    const { hasCriteria, query } = buildSearchQuery(req.query);
    const sort = buildSort(req.query);
    const from = extractFrom(req);
    const tooltips = await getSearchTooltips();

    if (!hasCriteria) {
      hitsData = [];
      nbHits = 0;
    } else {
      const esCountResponse = await esClient.count({
        index: config.elasticsearch.index_name,
        query,
      });
      nbHits = esCountResponse.count;

      const searchRequest = {
        index: config.elasticsearch.index_name,
        from,
        size: MAX_NB_HITS,
        _source: {
          excludes: [ 'content' ],
        },
        query,
        highlight : {
          encoder: 'html',
          fields : {
            content : {},
            intitule : {},
            objet : {},
          },
          fragment_size: 100,
          number_of_fragments: 3,
          pre_tags: ['<b>'],
          post_tags: ['</b>'],
        },
      };

      if (sort) {
        searchRequest.sort = sort;
      }

      const esResponse = await esClient.search(searchRequest);

      const hits = esResponse.hits.hits;
      hitsData = hits.map((hit, index) => {
        const highlightBits = [];
        if (hit.highlight && hit.highlight.content) {
          highlightBits.push(...hit.highlight.content);
        }
        if (hit.highlight && hit.highlight.objet) {
          highlightBits.push(...hit.highlight.objet);
        }

        return {
          index: index + from + 1,
          href: `/dce/${hit._source.annonce_id}`,
          annonce_id: hit._source.annonce_id,
          org_acronym: hit._source.org_acronym,
          intitule: hit.highlight && hit.highlight.intitule ? hit.highlight.intitule : hit._source.intitule,
          fetch_datetime: getDay(hit._source.fetch_datetime),
          date_limite_remise_plis: hit._source.date_limite_remise_plis
            ? getDay(String(hit._source.date_limite_remise_plis))
            : null,
          highlight: highlightBits.join(' … '),
        };
      });
    }

    const getPagination = function(expressQuery, from, pageSize, nbHits) {
      const currentPageIndex = Math.round(from / pageSize) + 1;
      const previousPageIndex = currentPageIndex - 1;
      const isLastPage = nbHits <= (currentPageIndex * pageSize);
      const nextPageIndex = !isLastPage && (currentPageIndex + 1);

      const firstPageHref = buildSearchPath(expressQuery, 0);
      const previousPageHref = buildSearchPath(expressQuery, (previousPageIndex - 1) * pageSize);
      const nextPageHref = buildSearchPath(expressQuery, (nextPageIndex - 1) * pageSize);

      return {
        isLastPage,
        currentPageIndex, previousPageIndex, nextPageIndex,
        firstPageHref, previousPageHref, nextPageHref,
      };
    };

    const pagination = hasCriteria && getPagination(req.query, from, MAX_NB_HITS, nbHits);


    res.render('search', {
      ...form,
      queryString: form.q,
      validQueryString: hasCriteria,
      tooltips,
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
