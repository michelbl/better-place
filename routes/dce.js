const express = require('express');
const router = express.Router();

const db = require('../db'); 


router.get('/:annonce_id-:org_acronym', function(req, res, next) {
  const annonceId = req.params.annonce_id;
  const orgAcronym = req.params.org_acronym;

  const dataRequest = db.one('SELECT * FROM dce WHERE annonce_id = $1 AND org_acronym = $2', [annonceId, orgAcronym])
  .catch(function(error) {
    var error = new Error("Not found");
    error.status = 404;
    next(error);
  })
  const filesRequest = db.any('SELECT * FROM files WHERE annonce_id = $1 AND org_acronym = $2', [annonceId, orgAcronym])

  Promise.all([dataRequest, filesRequest])
  .then(function([dceData, filesData], reject) {
    const documentTypes = ['avis', 'reglement', 'dce', 'complement'];
    var documentsByType = {};
    for (let documentType of documentTypes) {
      const documents = filesData.filter((doc) => doc.document_type === documentType);
      const urlBase = '/files/' + annonceId + '-' + orgAcronym + '-' + documentType;

      var originalDoc = documents.filter((doc) => doc.is_in_archive === false);
      var unzippedFiles = documents.filter((doc) => doc.is_in_archive === true).sort((a, b) => a.variablePart < b.variablePart);
      unzippedFiles = unzippedFiles.map((unzippedFiles) => {
        var fileData = {
          nodeType: unzippedFiles.node_type,
          name: unzippedFiles.variable_part,
        }
        if (unzippedFiles.node_type == 'file') {
          fileData.url = urlBase + '/' + unzippedFiles.variable_part;
        }
        
        return fileData;
      })
      const originalName = dceData['filename_' + documentType];

      if (originalName === null) {
        if (originalDoc !== []) {
          const error = new Error("Incoherent file storage");
        }
        if (unzippedFiles !== []) {
          const error = new Error("Incoherent file storage");
        }
      } else {
        if (originalDoc.len !== 1) {
          const error = new Error("Incoherent file storage");
        }
        originalDoc = {
          url: urlBase + originalDoc[0].ext,
          name: originalName,
        }

        documentsByType[documentType] = {
          originalDoc: originalDoc,
          unzippedFiles: unzippedFiles,
        };
      }
    }
    res.render('dce', { dceData, documentsByType });
  })
  .catch(function(error) {
    next(error)
  });
});

module.exports = router;
