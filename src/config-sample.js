var config = {
  elasticsearch: {
    index_name: 'dce',
    document_type: 'dce',
    initOptions: {
      host: 'localhost:9200',
      log: 'warning',
    },
  },
  publicPath: 'files/',
};

module.exports = config;
