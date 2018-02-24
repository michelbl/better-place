const express = require('express');
const { getDocCount } = require('../utils');


const router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const docCount = await getDocCount();
    res.render('index', { docCount });
  } catch(e) {
    return next(e);
  }
});

module.exports = router;
