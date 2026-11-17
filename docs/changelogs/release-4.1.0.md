---
title: 4.1.0
slug: /changelogs/4.1.0
sidebar_position: 0
---

# Release 4.1.0

:::note
4.1.0 is not released yet. This page collects the changes for the next release.
:::

## Deployment

### New features

- The reverse proxy serves the privacy policy at `/privacy` and the legal information at `/legal` as static pages from `CONF_TEMPLATE/staticfiles`. Before, the proxy forwarded these paths to Media, which answered with `401`, so the mobile app 3.0.9 showed an error instead of the privacy policy. A missing page answers with `404`.

## Upgrade from 4.0.2

1. If you serve a privacy policy or legal information, copy the new [`default.conf.template`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/default.conf.template) and `docker-compose.yml`. Remove own `location` blocks for these paths from the old template.
2. Store the pages as `privacy.html` and `legal.html` in `CONF_TEMPLATE/staticfiles`. See [Reverse proxy](../setup/backend/05-reverse-proxy.md#privacy-policy-and-legal-information).
3. Recreate the proxy.

```bash
sudo docker compose up -d wekode.mml.reverseproxy
```
