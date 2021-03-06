
## Install

Copy `config-sample.js` to `config.js` and write your settings.

```
npm install
```

## Run

`NODE_ENV=development npm start`
`NODE_ENV=production npm start`

## Sample nginx configuration

```
server {
        listen 80;
        server_name betterplace.info www.betterplace.info;
        return 301 https://betterplace.info$request_uri;
}

server {
        listen 443 ssl;

        ssl_certificate /etc/letsencrypt/live/betterplace.info/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/betterplace.info/privkey.pem;

        server_name betterplace.info;

        location / {
                proxy_pass http://localhost:3000;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_cache_bypass $http_upgrade;
        }

        location /files {
                alias /path/to/scraper-place/data/public;
        }

        location /database-backups {
            alias /path/to/scraper-place/data/backups;
            autoindex on;
        }

}
```
