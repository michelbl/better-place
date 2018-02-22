var config = {
  postgresql: {
    details: {
      host: '/var/run/postgresql',  // UNIX socket ("local" in pg_hba.conf)
      port: 5432,
      database: 'place',
      user: 'place',
      password: '***',
      //ssl: true,  if not using a UNIX socket
    },
    initOptions: {},
  },
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
