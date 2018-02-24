const express = require('express');
const esClient = require('../elasticsearch_client'); 


const router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const dceList = [];
    const data = {
      dceList,
      nbDce: dceList.length,
    }
    res.render('all', data);
  } catch(e) {
    return next(e);
  }
});

module.exports = router;
