const express = require('express');
const router = express.Router();

const db = require('../db'); 


router.get('/:annonce_id-:org_acronym', function(req, res, next) {
  annonceId = req.params.annonce_id
  orgAcronym = req.params.org_acronym
  db.one('SELECT * FROM dce WHERE annonce_id = $1 AND org_acronym = $2', [annonceId, orgAcronym])
  .then(function(dceData) {
    res.render('dce', { dceData });
  })
  .catch(function(error) {
    res.send(JSON.stringify(error));
  });
});

module.exports = router;
