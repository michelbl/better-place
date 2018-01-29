const express = require('express');
const database = require('../database'); 


const router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const dceList = await database.any('SELECT * FROM dce')
    const data = {
      dceList,
      nbDce: dceList.length,
    }
    res.render('all', data);
  } catch(e) {
    next(e);
  }
});

module.exports = router;
