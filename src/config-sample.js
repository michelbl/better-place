var config = {
  elasticsearch: {
    index_name: 'dce',
    document_type: 'dce',
    initOptions: {
      node: 'http://localhost:9200',
    },
  },
  publicPath: 'files/',
};

module.exports = config;
