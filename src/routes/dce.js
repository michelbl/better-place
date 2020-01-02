const path = require('path');
const express = require('express');
const config = require('../config');
const esClient = require('../elasticsearch_client'); 
const { publicPath } = require('../config');

const router = express.Router();

const UNKNOWN_FILE_SIZE_MESSAGE = "Taille inconnue";

router.get('/:annonce_id', async function(req, res, next) {
  const annonceId = req.params.annonce_id;
  let dceData;

  try {
    const esResponse = await esClient.get({
      index: config.elasticsearch.index_name,
      id: annonceId,
      _source_excludes: [ 'content' ],
    });

    dceData = esResponse.body._source;

  } catch(error) {
    const notFoundError = new Error("Not found");
    notFoundError.status = 404;
    return next(notFoundError);
  }

  const {
    annonce_id, org_acronym, links_boamp, reference, intitule, objet, reglement_ref,
    filename_reglement, filename_complement, filename_avis, filename_dce,
    fetch_datetime,
    file_size_reglement, file_size_complement, file_size_avis, file_size_dce,
    embedded_filenames_reglement, embedded_filenames_complement, embedded_filenames_avis, embedded_filenames_dce,
  } = dceData;

  const buildHref = (annonce_id, documentType, originalName) =>
    `/${publicPath}${annonce_id}-${documentType}${path.extname(originalName)}`;

  const viewData = {
    place_metadata: {
      annonce_id, org_acronym, links_boamp, reference, intitule, objet, reglement_ref,
    },
    betterplace_metadata: {
      original_url: `https://www.marches-publics.gouv.fr/index.php?page=entreprise.EntrepriseDetailsConsultation&refConsultation=${annonce_id}&orgAcronyme=${org_acronym}`,
      fetch_datetime,
    },
    reglement: filename_reglement && {
      href: buildHref(annonce_id, 'reglement', filename_reglement),
      filename: filename_reglement,
      file_size: file_size_reglement || UNKNOWN_FILE_SIZE_MESSAGE,
      embedded_filenames: embedded_filenames_reglement,
    },
    complement: filename_complement && {
      href: buildHref(annonce_id, 'complement', filename_complement),
      filename: filename_complement,
      file_size: file_size_complement || UNKNOWN_FILE_SIZE_MESSAGE,
      embedded_filenames: embedded_filenames_complement,
    },
    avis: filename_avis && {
      href: buildHref(annonce_id, 'avis', filename_avis),
      filename: filename_avis,
      file_size: file_size_avis || UNKNOWN_FILE_SIZE_MESSAGE,
      embedded_filenames: embedded_filenames_avis,
    },
    dce: filename_dce && {
      href: buildHref(annonce_id, 'dce', filename_dce),
      filename: filename_dce,
      file_size: file_size_dce || UNKNOWN_FILE_SIZE_MESSAGE,
      embedded_filenames: embedded_filenames_dce,
    },
  };

  res.render('dce', viewData);
});

module.exports = router;
