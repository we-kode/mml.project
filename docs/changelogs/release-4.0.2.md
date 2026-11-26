---
title: 4.0.2
slug: /changelogs/4.0.2
sidebar_position: 1
---

# Release 4.0.2

This release fixes the start of Identity and Media, if the user or password of the message bus contains special characters, the login of the apps on instances with upper case letters in `INSTANCE`, and the update of the admin app on Windows.

## Identity and Media

### Bugfixes

- `MessageBus:User`, `MessageBus:Password` and `MessageBus:VirtualHost` may contain characters like `@`, `:`, `/`, `#`, `?`, `%`, `;` or `,`. Before, Identity, the Identity CLI and Media failed to start with `Invalid URI: The hostname could not be parsed.`
- Identity issues access tokens, which Identity and Media accept, if `INSTANCE` contains upper case letters. Before, every request of the apps and the admin app was rejected with `401`, and the mobile app stayed on the loading screen. Keep `INSTANCE` unchanged, the name of an instance cannot be changed after the first start.

## Admin app

### Bugfixes

- **Update** downloads the installer and opens it on Windows. Before, the installer was downloaded, but the file explorer opened the `Documents` folder instead of the installer.

## Upgrade from 4.0.1

1. Set `IDENTITY_VERSION` and `MEDIA_VERSION` to `4.0.2`.
2. If you percent-encoded the password in the `MessageBus` section to work around the bug, replace it with the plain password again in `identity/appsettings.json` and `media/appsettings.json`.
3. Pull and start the services.

```bash
sudo docker compose pull wekode.mml.identity wekode.mml.media
sudo docker compose up -d wekode.mml.identity wekode.mml.media
```

4. On Windows, install the admin app 4.0.2 once manually from the [releases](https://github.com/we-kode/mml.administration-app/releases). The update button of 4.0.1 and older does not start the installer.
