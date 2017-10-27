var config = {};

config.postgresql = {
  details: {
    host: '/var/run/postgresql',  // UNIX socket ("local" in pg_hba.conf)
    port: 5432,
    database: 'place',
    user: 'place',
    password: 'place',
    //ssl: true,  if not using a UNIX socket
  },
  initOptions: {},
};

module.exports = config;
