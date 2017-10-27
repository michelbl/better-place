const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db'); 

/* GET users listing. */
router.get('/', function(req, res, next) {
  db.any('SELECT * FROM dce')
  .then(function(data) {
    res.send(JSON.stringify(data));
  })
  .catch(function(error) {
    res.send(JSON.stringify(error));
  });
  /*try {
    const dce = yield db.any('SELECT * FROM dce');
    res.send(JSON.stringify(dce));
  } 
  catch(e) {
    res.send(JSON.stringify(e));
  }*/
});

module.exports = router;
