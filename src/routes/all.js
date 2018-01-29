const express = require('express');
const db = require('../db'); 


const router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const dceList = await db.any('SELECT * FROM dce')
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
