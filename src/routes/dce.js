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

  res.render('dce', { dceData });
});

module.exports = router;
