---
title: 4.0.1
slug: /changelogs/4.0.1
sidebar_position: 2
---

# Release 4.0.1

This release fixes the reverse proxy for installations, which run Identity and Media without `TLS:Cert`, and several bugs of the admin app.

## Deployment

### Bugfixes

- The reverse proxy passes the public `Host` header to the services. Before, Identity built the endpoints of the OpenID configuration with its internal address, and Media failed to validate tokens with `The SSL connection could not be established`, if Identity runs without `TLS:Cert`.

## Admin app

### Bugfixes

- Groups assigned to a client are marked in the client list right after the assignment. Before, the list showed them only after reloading it.
- On Windows the admin app no longer freezes, until the dialog to upload a folder opens. While a file or folder dialog is open, the upload buttons do not open a second dialog.
- The record list reloads after an upload, so the uploaded records are shown at once.
- If the last similar client is removed during the registration of a client, the registration form opens directly. Before, an empty list had to be confirmed.
- The registration of a client shows that the admin app connects to the server, until the QR code is shown. If the connection fails with an error other than `401`, the dialog closes without connecting again.

## Upgrade from 4.0.0

1. Replace `default.conf.template` of the reverse proxy with the [current version](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/default.conf.template).
2. If TLS is terminated at an [external proxy](../setup/backend/operations#ssl-termination-at-an-external-proxy), make sure it keeps the original `Host` header. Nginx Proxy Manager, Traefik and Caddy do this by default.
3. Restart the reverse proxy.

```bash
sudo docker compose up -d --force-recreate wekode.mml.reverseproxy
```

4. Install the admin app 4.0.1. The admin app works with the services of 4.0.0 and later.
