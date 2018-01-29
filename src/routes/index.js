var express = require('express');
var router = express.Router();

const db = require('../db'); 


router.get('/', function(req, res, next) {
  db.any('SELECT * FROM dce')
  .then(function(dceList) {
    res.render('index', { dceList });
  })
  .catch(function(error) {
    res.send(JSON.stringify(error));
  });
});

module.exports = router;
