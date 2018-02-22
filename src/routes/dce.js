const path = require('path');
const express = require('express');
const database = require('../database');


const router = express.Router();

router.get('/:annonce_id-:org_acronym', async function(req, res, next) {
  const annonceId = req.params.annonce_id;
  const orgAcronym = req.params.org_acronym;
  let dceData;

  try {
    dceData = await database.one('SELECT * FROM dce WHERE annonce_id = $1 AND org_acronym = $2', [annonceId, orgAcronym]);
  } catch(error) {
    const notFoundError = new Error("Not found");
    notFoundError.status = 404;
    next(notFoundError);
  }

  const {
    annonce_id, org_acronym, links_boamp, reference, intitule, objet, reglement_ref,
    filename_reglement, filename_complement, filename_avis, filename_dce,
    fetch_datetime,
    file_size_reglement, file_size_complement, file_size_avis, file_size_dce,
    glacier_id_reglement, glacier_id_complement, glacier_id_avis, glacier_id_dce,
    embedded_filenames_reglement, embedded_filenames_complement, embedded_filenames_avis, embedded_filenames_dce,
    state,
  } = dceData;

  const buildHref = (annonce_id, org_acronym, documentType, originalName) =>
    `${annonce_id}-${org_acronym}-reglement${path.extname(originalName)}`;

  const viewData = {
    place_metadata: {
      annonce_id, org_acronym, links_boamp, reference, intitule, objet, reglement_ref,
    },
    betterplace_metadata: {
      original_url: `https://www.marches-publics.gouv.fr/index.php?page=entreprise.EntrepriseDetailsConsultation&refConsultation=${annonce_id}&orgAcronyme=${org_acronym}`,
      fetch_datetime, state,
    },
    reglement: filename_reglement && {
      href: buildHref(annonce_id, org_acronym, 'reglement', filename_reglement),
      filename: filename_reglement,
      file_size: file_size_reglement,
      glacier_id: glacier_id_reglement,
      embedded_filenames: embedded_filenames_reglement,
    },
    complement: filename_complement && {
      href: buildHref(annonce_id, org_acronym, 'complement', filename_complement),
      filename: filename_complement,
      file_size: file_size_complement,
      glacier_id: glacier_id_complement,
      embedded_filenames: embedded_filenames_complement,
    },
    avis: filename_avis && {
      href: buildHref(annonce_id, org_acronym, 'avis', filename_avis),
      filename: filename_avis,
      file_size: file_size_avis,
      glacier_id: glacier_id_avis,
      embedded_filenames: embedded_filenames_avis,
    },
    dce: filename_dce && {
      href: buildHref(annonce_id, org_acronym, 'dce', filename_dce),
      filename: filename_dce,
      file_size: file_size_dce,
      glacier_id: glacier_id_dce,
      embedded_filenames: embedded_filenames_dce,
    },
  };

  res.render('dce', viewData);
});

module.exports = router;
