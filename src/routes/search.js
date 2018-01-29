const express = require('express');
const db = require('../db'); 

const router = express.Router();


router.get('/', function(req, res, next) {
  db.any('SELECT * FROM dce')
  .then(function(dceList) {
    res.render('search', { dceList });
  })
  .catch(function(error) {
    res.send(JSON.stringify(error));
  });
});

module.exports = router;
