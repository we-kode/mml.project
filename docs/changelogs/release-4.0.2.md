---
title: 4.0.2
slug: /changelogs/4.0.2
sidebar_position: 1
---

# Release 4.0.2

This release fixes the start of Identity and Media, if the user or password of the message bus contains special characters.

## Identity and Media

### Bugfixes

- `MessageBus:User`, `MessageBus:Password` and `MessageBus:VirtualHost` may contain characters like `@`, `:`, `/`, `#`, `?`, `%`, `;` or `,`. Before, Identity, the Identity CLI and Media failed to start with `Invalid URI: The hostname could not be parsed.`

## Upgrade from 4.0.1

1. Set `IDENTITY_VERSION` and `MEDIA_VERSION` to `4.0.2`.
2. If you percent-encoded the password in the `MessageBus` section to work around the bug, replace it with the plain password again in `identity/appsettings.json` and `media/appsettings.json`.
3. Pull and start the services.

```bash
sudo docker compose pull wekode.mml.identity wekode.mml.media
sudo docker compose up -d wekode.mml.identity wekode.mml.media
```
