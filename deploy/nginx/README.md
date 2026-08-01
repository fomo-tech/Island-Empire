# Production API gateway

This directory is the required outer gate for the game API. It rejects abusive traffic before it reaches Node, bcrypt, or MongoDB.

1. Copy `island-empire.conf` to `/etc/nginx/conf.d/` and replace `example.com`.
2. Copy `island-proxy.conf` to `/etc/nginx/snippets/`.
3. Configure TLS on the public server or use a CDN/WAF that terminates TLS before Nginx.
4. Bind Node to `127.0.0.1:4000` or firewall port `4000` so it is reachable only from Nginx.
5. Set `TRUST_PROXY=true` and a random 32+ byte `ANTI_BOT_SECRET` in the server environment.
6. Test with `sudo nginx -t`, then reload Nginx.

The limits intentionally use separate buckets: challenge requests, auth mutations, general API requests, and concurrent connections. A response `429` from Nginx means the request never reached Node.

If Cloudflare is enabled, proxy the DNS record through it and configure its WAF rate rules with thresholds no higher than these auth routes. Do not trust forwarded client-IP headers until Node is reachable only through the configured proxy.
