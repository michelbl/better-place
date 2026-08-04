const config = require('./config');
const esClient = require('./elasticsearch_client');

const TEXT_MATCH_FIELDS = [
  'intitule',
  'reference',
  'organisme',
  'objet',
  'entite_achat',
  'procedure',
  'lieu_execution',
  'code_cpv',
  'org_acronym',
  'annonce_id',
  'reglement_ref',
  'categorie_principale',
];

const EMBEDDED_FILENAME_FIELDS = [
  'embedded_filenames_dce',
  'embedded_filenames_reglement',
  'embedded_filenames_avis',
  'embedded_filenames_complement',
];

const Q_FIELD_OPTIONS = {
  content: ['content'],
  intitule: ['intitule'],
  objet: ['objet'],
  all: ['content', 'intitule', 'objet'],
};

const FILE_PRESENCE_FIELDS = {
  has_dce: 'filename_dce',
  has_avis: 'filename_avis',
  has_reglement: 'filename_reglement',
  has_complement: 'filename_complement',
};

// Elasticsearch default index.max_result_window; from + size must stay within this.
const MAX_RESULT_WINDOW = 10000;

function extractFrom(req, pageSize) {
  const parsed = parseInt(req.query.from, 10);
  const from = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  if (pageSize == null) {
    return from;
  }
  const maxFrom = Math.max(0, MAX_RESULT_WINDOW - pageSize);
  return Math.min(from, maxFrom);
}

function capHitsForPagination(nbHits) {
  return Math.min(nbHits, MAX_RESULT_WINDOW);
}

function isEmpty(stringVar) {
  return stringVar === '' || stringVar === undefined || stringVar === null;
}

function getString(expressQuery, key) {
  const value = expressQuery[key];
  return typeof value === 'string' && !isEmpty(value) ? value : null;
}

function isChecked(expressQuery, key) {
  const value = expressQuery[key];
  return value === '1' || value === 'on' || value === 'true';
}

function parsePositiveNumber(value) {
  if (typeof value !== 'string' || isEmpty(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function megabytesToBytes(value) {
  const mb = parsePositiveNumber(value);
  return mb === null ? null : Math.round(mb * 1024 * 1024);
}

function buildTextQuery(queryText, qField, phrase) {
  const fields = Q_FIELD_OPTIONS[qField] || Q_FIELD_OPTIONS.content;
  const clauseType = phrase ? 'match_phrase' : 'match';

  if (fields.length === 1) {
    return {
      [clauseType]: {
        [fields[0]]: queryText,
      },
    };
  }

  return {
    multi_match: {
      query: queryText,
      fields,
      type: phrase ? 'phrase' : 'best_fields',
    },
  };
}

function addDateRangeFilter(filter, field, minValue, maxValue) {
  if (!minValue && !maxValue) {
    return;
  }

  const range = {};
  if (minValue) {
    range.gte = minValue;
  }
  if (maxValue) {
    range.lte = maxValue;
  }
  filter.push({ range: { [field]: range } });
}

/**
 * Build an Elasticsearch bool query from the search form querystring.
 * @param {Record<string, string | string[] | undefined>} expressQuery
 */
function buildSearchQuery(expressQuery) {
  const must = [];
  const must_not = [];
  const filter = [];

  const q = getString(expressQuery, 'q');
  const exclude = getString(expressQuery, 'exclude');
  const qField = getString(expressQuery, 'q_field') || 'content';
  const phrase = isChecked(expressQuery, 'phrase');

  if (q) {
    must.push(buildTextQuery(q, qField, phrase));
  }
  if (exclude) {
    must_not.push(buildTextQuery(exclude, qField, false));
  }

  for (const field of TEXT_MATCH_FIELDS) {
    const value = getString(expressQuery, field);
    if (value) {
      must.push({
        match: {
          [field]: value,
        },
      });
    }
  }

  const allotissement = getString(expressQuery, 'allotissement');
  if (allotissement === 'non') {
    filter.push({ term: { 'allotissement.keyword': 'Non' } });
  } else if (allotissement === 'oui') {
    filter.push({ exists: { field: 'allotissement' } });
    must_not.push({ term: { 'allotissement.keyword': 'Non' } });
  }

  addDateRangeFilter(
    filter,
    'date_limite_remise_plis',
    getString(expressQuery, 'date_limite_min'),
    getString(expressQuery, 'date_limite_max'),
  );

  if (isChecked(expressQuery, 'ouverte')) {
    filter.push({
      range: {
        date_limite_remise_plis: {
          gte: 'now',
        },
      },
    });
  }

  addDateRangeFilter(
    filter,
    'fetch_datetime',
    getString(expressQuery, 'fetch_min'),
    getString(expressQuery, 'fetch_max'),
  );

  const fetchDays = parsePositiveNumber(expressQuery.fetch_days);
  if (fetchDays !== null && fetchDays > 0) {
    filter.push({
      range: {
        fetch_datetime: {
          gte: `now-${Math.floor(fetchDays)}d/d`,
        },
      },
    });
  }

  for (const [param, field] of Object.entries(FILE_PRESENCE_FIELDS)) {
    if (isChecked(expressQuery, param)) {
      filter.push({ exists: { field } });
    }
  }

  const sizeMin = megabytesToBytes(expressQuery.size_min);
  const sizeMax = megabytesToBytes(expressQuery.size_max);
  if (sizeMin !== null || sizeMax !== null) {
    const range = {};
    if (sizeMin !== null) {
      range.gte = sizeMin;
    }
    if (sizeMax !== null) {
      range.lte = sizeMax;
    }
    filter.push({ range: { file_size_dce: range } });
  }

  const embeddedFilename = getString(expressQuery, 'embedded_filename');
  if (embeddedFilename) {
    must.push({
      multi_match: {
        query: embeddedFilename,
        fields: EMBEDDED_FILENAME_FIELDS,
      },
    });
  }

  const hasCriteria = must.length > 0 || must_not.length > 0 || filter.length > 0;

  return {
    hasCriteria,
    query: {
      bool: {
        must,
        must_not,
        filter,
      },
    },
  };
}

function buildSort(expressQuery) {
  const sort = getString(expressQuery, 'sort') || 'relevance';

  switch (sort) {
    case 'fetch_desc':
      return [{ fetch_datetime: 'desc' }];
    case 'fetch_asc':
      return [{ fetch_datetime: 'asc' }];
    case 'deadline_asc':
      return [{ date_limite_remise_plis: { order: 'asc', unmapped_type: 'date' } }];
    case 'deadline_desc':
      return [{ date_limite_remise_plis: { order: 'desc', unmapped_type: 'date' } }];
    default:
      return undefined;
  }
}

function extractSearchForm(expressQuery) {
  const form = {
    q: getString(expressQuery, 'q') || '',
    exclude: getString(expressQuery, 'exclude') || '',
    q_field: getString(expressQuery, 'q_field') || 'content',
    phrase: isChecked(expressQuery, 'phrase'),
    intitule: getString(expressQuery, 'intitule') || '',
    reference: getString(expressQuery, 'reference') || '',
    organisme: getString(expressQuery, 'organisme') || '',
    objet: getString(expressQuery, 'objet') || '',
    entite_achat: getString(expressQuery, 'entite_achat') || '',
    procedure: getString(expressQuery, 'procedure') || '',
    categorie_principale: getString(expressQuery, 'categorie_principale') || '',
    lieu_execution: getString(expressQuery, 'lieu_execution') || '',
    code_cpv: getString(expressQuery, 'code_cpv') || '',
    org_acronym: getString(expressQuery, 'org_acronym') || '',
    annonce_id: getString(expressQuery, 'annonce_id') || '',
    reglement_ref: getString(expressQuery, 'reglement_ref') || '',
    allotissement: getString(expressQuery, 'allotissement') || '',
    date_limite_min: getString(expressQuery, 'date_limite_min') || '',
    date_limite_max: getString(expressQuery, 'date_limite_max') || '',
    ouverte: isChecked(expressQuery, 'ouverte'),
    fetch_min: getString(expressQuery, 'fetch_min') || '',
    fetch_max: getString(expressQuery, 'fetch_max') || '',
    fetch_days: getString(expressQuery, 'fetch_days') || '',
    has_dce: isChecked(expressQuery, 'has_dce'),
    has_avis: isChecked(expressQuery, 'has_avis'),
    has_reglement: isChecked(expressQuery, 'has_reglement'),
    has_complement: isChecked(expressQuery, 'has_complement'),
    size_min: getString(expressQuery, 'size_min') || '',
    size_max: getString(expressQuery, 'size_max') || '',
    embedded_filename: getString(expressQuery, 'embedded_filename') || '',
    sort: getString(expressQuery, 'sort') || 'relevance',
  };

  form.filtersOpen = Object.entries(form).some(([key, value]) => {
    if (key === 'q' || key === 'filtersOpen') {
      return false;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (key === 'q_field') {
      return value !== 'content';
    }
    if (key === 'sort') {
      return value !== 'relevance';
    }
    return !isEmpty(value);
  });

  return form;
}

function buildSearchPath(expressQuery, from) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(expressQuery)) {
    if (key === 'from' || value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isEmpty(item)) {
          params.append(key, item);
        }
      }
    } else if (typeof value === 'string' && !isEmpty(value)) {
      params.set(key, value);
    }
  }

  if (from > 0) {
    params.set('from', String(from));
  }

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : '/search';
}

function getDay(datetimeISOString) {
  return String(datetimeISOString).slice(0, 10);
}

async function getDocCount() {
  const esCountResponse = await esClient.count({
    index: config.elasticsearch.index_name,
  });
  return esCountResponse.count;
}

const TOOLTIP_CACHE_TTL_MS = 60 * 60 * 1000;
let tooltipCache = null;
let tooltipCacheAt = 0;

function formatExamples(values, limit = 4) {
  const unique = [...new Set(values.filter(Boolean))];
  return unique.slice(0, limit).join(', ');
}

function tip(explanation, examples) {
  if (!examples) {
    return explanation;
  }
  return `${explanation} Exemples : ${examples}.`;
}

async function fetchFrequentTerms(field, size = 8) {
  try {
    const response = await esClient.search({
      index: config.elasticsearch.index_name,
      size: 0,
      aggs: {
        values: {
          terms: {
            field,
            size,
          },
        },
      },
    });
    return response.aggregations.values.buckets.map((bucket) => bucket.key);
  } catch (_error) {
    return [];
  }
}

async function getSearchTooltips() {
  if (tooltipCache && Date.now() - tooltipCacheAt < TOOLTIP_CACHE_TTL_MS) {
    return tooltipCache;
  }

  const [organismes, orgAcronyms, embeddedFilenames] = await Promise.all([
    fetchFrequentTerms('organisme.keyword', 6),
    fetchFrequentTerms('org_acronym.keyword', 6),
    fetchFrequentTerms('embedded_filenames_dce.keyword', 30),
  ]);

  const shortOrganismes = organismes
    .filter((name) => name.length <= 48)
    .slice(0, 4);

  const embeddedExamples = embeddedFilenames
    .map((name) => String(name).replace(/^\//, ''))
    .filter((name) => !/Thumbs|image\d|Feuille/i.test(name))
    .map((name) => name.replace(/\.(pdf|doc|docx)$/i, ''))
    .filter((name, index, all) => all.indexOf(name) === index)
    .slice(0, 5);

  tooltipCache = {
    q: tip(
      'Texte libre cherché dans le contenu des dossiers (PDF, Word, etc.).',
      'logiciel, nettoyage, formation',
    ),
    q_field: 'Champ dans lequel appliquer la recherche principale (contenu des fichiers, intitulé, objet, ou les trois).',
    exclude: tip(
      'Retire les dossiers qui contiennent ces mots.',
      'maintenance, renouvellement',
    ),
    phrase: 'Les mots de la recherche principale doivent apparaître à la suite, dans cet ordre.',
    intitule: tip('Titre court de la consultation.', 'fourniture, travaux, prestation'),
    objet: tip('Description détaillée de la consultation, souvent plus complète que l’intitulé.', 'maintenance, assistance'),
    reference: tip('Référence interne de la consultation chez l’acheteur.', '2024-01, 26-MAPA'),
    reglement_ref: 'Identifiant technique du règlement de consultation sur PLACE (souvent encodé).',
    organisme: tip('Catégorie d’acheteur public telle qu’affichée sur PLACE.', formatExamples(shortOrganismes)),
    entite_achat: tip(
      'Service ou direction acheteuse, plus précis que l’organisme.',
      'direction des achats, SGAMI',
    ),
    org_acronym: tip('Code PLACE de l’organisme acheteur.', formatExamples(orgAcronyms)),
    annonce_id: tip('Identifiant numérique PLACE de la consultation.', '3046429'),
    lieu_execution: tip(
      'Lieu où le marché sera exécuté (département, ville, ou FRANCE).',
      '(75) Paris, (66) Pyrénées-Orientales, FRANCE',
    ),
    code_cpv: tip(
      'Code CPV du vocabulaire commun des marchés publics (nature des prestations).',
      '45000000, 72000000, 90000000',
    ),
    categorie_principale: 'Grande famille PLACE du marché : Travaux, Fournitures ou Services.',
    procedure: tip(
      'Type de procédure de passation.',
      'Procédure adaptée, Appel d’offres ouvert, Marché négocié',
    ),
    allotissement: 'Indique si la consultation est découpée en lots (Alloti) ou non (Non alloti).',
    date_limite: 'Borne sur la date limite de remise des plis (date d’échéance des offres).',
    ouverte: 'Ne garde que les consultations dont la date limite de remise des plis est encore à venir.',
    fetch_date: 'Borne sur la date à laquelle Better Place a téléchargé le dossier depuis PLACE.',
    fetch_days: tip('Raccourci pour ne garder que les dossiers téléchargés récemment.', '7, 30'),
    has_files: 'Ne garde que les consultations pour lesquelles le fichier correspondant est disponible.',
    embedded_filename: tip(
      'Cherche dans les noms de fichiers contenus dans les archives (DCE, règlement, avis…).',
      formatExamples(embeddedExamples),
    ),
    size: tip('Filtre sur la taille de l’archive DCE, en mégaoctets.', '1, 50'),
    sort: 'Ordre d’affichage des résultats. La pertinence utilise le score Elasticsearch.',
  };
  tooltipCacheAt = Date.now();
  return tooltipCache;
}

// Kept for callers that still import the old name.
function generateMatchQueriesFromRequest(expressQuery) {
  const { query } = buildSearchQuery(expressQuery);
  return query.bool.must;
}

module.exports = {
  MAX_RESULT_WINDOW,
  extractFrom,
  capHitsForPagination,
  getDay,
  getDocCount,
  generateMatchQueriesFromRequest,
  buildSearchQuery,
  buildSort,
  extractSearchForm,
  buildSearchPath,
  getSearchTooltips,
};
