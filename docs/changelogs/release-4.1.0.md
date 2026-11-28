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
- The database and the message bus have healthchecks. Identity and Media start only when both accept connections. Before, they could start too early and restarted until the database and the message bus were ready.

## Identity and Media

### New features

- On start, the log shows `'TLS:Cert' configured. Listening on https.`, if a certificate is configured. Without a certificate it still shows that the service listens on http.

### Bug fixes

- A restart or short outage of PostgreSQL or RabbitMQ no longer crashes the services. Database requests are retried up to 3 times. If the outage lasts longer, the request answers with `503 Service Unavailable` and `Retry-After: 5` instead of `500`. See [Outages of the database or the message bus](../setup/backend/operations.md#outages-of-the-database-or-the-message-bus).
- On start, both services wait up to 60 seconds for the database. Media also waits for the message bus to subscribe to the events.
- Media no longer stops, if the migration of the bitrates or covers fails. The migration runs again on the next start.
- Identity stores the events for groups and clients together with the change in the database and sends them afterwards. Events created while RabbitMQ is not available are sent, when it is available again. The migration adds the table `outbox_message` and runs automatically on start.
- The Identity CLI no longer connects to RabbitMQ. Changes made with the CLI are sent by the identity service.

## Upgrade from 4.0.2

1. If you serve a privacy policy or legal information, copy the new [`default.conf.template`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/default.conf.template) and `docker-compose.yml`. Remove own `location` blocks for these paths from the old template.
2. Store the pages as `privacy.html` and `legal.html` in `CONF_TEMPLATE/staticfiles`. See [Reverse proxy](../setup/backend/05-reverse-proxy.md#privacy-policy-and-legal-information).
3. Recreate the proxy.

```bash
sudo docker compose up -d wekode.mml.reverseproxy
```

4. Recommended: copy the new `docker-compose.yml` to use the healthchecks of the database and the message bus. Without them the services still recover, but restart until the database and the message bus are ready. Pull and recreate the services to update Identity and Media.

```bash
sudo docker compose pull
sudo docker compose up -d
```
