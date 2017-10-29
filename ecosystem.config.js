module.exports = {
  apps : [
    {
      name      : 'better-place',
      script    : 'bin/www',
      env: {
      },
      env_production : {
        NODE_ENV: 'production',
      },
    },
  ],
};
