# Deploy Hex Rivals to a VPS

Nginx serves the Vite build and proxies `/api` and `/ws` to a private Node
process. MongoDB, Node port `4001`, and all admin credentials stay private.

## One-time setup

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin hexrivals
sudo mkdir -p /var/www
sudo chown hexrivals:hexrivals /var/www
sudo -u hexrivals git clone git@github.com:OWNER/REPOSITORY.git /var/www/hexrivals
cd /var/www/hexrivals
sudo -u hexrivals npm run install:all
sudo -u hexrivals npm run build
sudo -u hexrivals cp deploy/production.env.example apps/server/.env
sudo -u hexrivals chmod 600 apps/server/.env
```

Edit `apps/server/.env`; replace every secret, password and example domain.

```bash
sudo cp deploy/systemd/hexrivals.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hexrivals
sudo systemctl status hexrivals
```

## Nginx and TLS

Copy `deploy/nginx/island-empire.conf` to `/etc/nginx/conf.d/`, replace
`example.com`, then install the proxy snippet.

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp deploy/nginx/island-proxy.conf /etc/nginx/snippets/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d game.example.com
```

Only ports `80` and `443` should be public. Do not expose `4001` or `27017`.

## Release update

```bash
cd /var/www/hexrivals
sudo -u hexrivals git pull --ff-only
sudo -u hexrivals npm run build
sudo systemctl restart hexrivals
curl -fsS https://game.example.com/api/health
```

Back up MongoDB before an upgrade. Follow API logs with
`sudo journalctl -u hexrivals -f`.
