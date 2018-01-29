let config = undefined

if (process.env.NODE_ENV === 'development') {
  config = require('./config_dev');
} else {
  config = require('./config_prod');  
}

module.exports = config;
