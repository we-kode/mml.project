---
title: 4.0.0
slug: /changelogs/4.0.0
---

# Release 4.0.0

This release follows Identity 3.0.0, Media 3.0.0, the administration app 3.0.0 and the mobile app 3.0.9. All components are released as 4.0.0.

Highlights:

- Records can be synchronized with partner instances ([federation](../concepts/federation)).
- Users can [share](../concepts/sharing) searches, playbacks and download links.
- Admins can send [announcements](../concepts/announcements) to the mobile app and change covers of records.
- TLS can be terminated at the reverse proxy or at an [external proxy](../setup/backend/operations#ssl-termination-at-an-external-proxy).
- The services use .NET 10 and a new message bus library.

Existing installations follow the [upgrade guide](#upgrade-from-3x) at the end of this page.

## Media

### New features

- [Federation](../concepts/federation) of partner instances with invitation codes, rotating signing keys, chunked record transfers, transfer progress, revoking a synchronization, address changes of partners and an audit log.
- [Share links](../concepts/sharing) for searches, playbacks and downloads with share rules per group. Download and landing pages are served under `/media/s/` and can be styled with `styling.json`.
- [Announcements](../concepts/announcements) for the mobile app.
- Covers can be changed and are stored as files instead of base64. Unused covers are cleaned up automatically.
- Every record knows the instance it belongs to (`INSTANCE`).
- Indexing runs in the service instead of through the message bus.
- MP3 files are accepted with all common MIME types.
- TLS is optional. Without `TLS:Cert` the service listens on http and trusts the forwarded headers of the reverse proxy from private networks or the networks in `ForwardedHeaders:KnownNetworks`.
- The secret of the federation keys can be read from a file in `FEDERATION_KEY_SECRET_FILE`.
- The Docker image contains the third-party notices of all packages.
- The optional setting `Connection:ServerName` announces a new domain to the apps and the admin app, so registered devices [move to another domain](../setup/backend/operations#move-to-another-domain) without registering again.

### Bugfixes

- Locked records can not be deleted anymore.
- Share pages open without an app key, and records contain the id of their album.

### Breaking changes

- .NET 10 and Rebus instead of MassTransit. The configuration section `MassTransit` is renamed to `MessageBus` and the service uses the queue `mml.media.queue`.
- `OpenId:EncryptionCert` is removed. Media validates the JSON Web Tokens of Identity with its public keys.
- `INSTANCE` is required and can not be changed after the first start.
- The reverse proxy has to forward `/hub/federation` and `/media/s/` to the service.

## Identity

### New features

- Identity issues JSON Web Tokens instead of opaque tokens.
- The encryption and signing certificates are created automatically in `IDENTITY_SECRETS_PATH` and can be protected with secrets. The secrets can be read from files in `ENCRYPT_SECRET_FILE` and `SIGN_SECRET_FILE`.
- Filter for inactive clients.
- TLS is optional. Without `TLS:Cert` the service listens on http and trusts the forwarded headers of the reverse proxy from private networks or the networks in `ForwardedHeaders:KnownNetworks`.
- The Docker image contains the third-party notices of all packages.

### Bugfixes

- Certificates created without secret are protected, when a secret is configured later.
- The encryption secret is read from `ENCRYPT_SECRET`.
- The example connection string of Redis uses port 6379 without TLS like the Redis configuration of the deployment.

### Breaking changes

- .NET 10 and Rebus instead of MassTransit. The configuration section `MassTransit` is renamed to `MessageBus`.
- `OpenId:EncryptionCert` and `OpenId:SigningCert` are removed. The certificates are read from `IDENTITY_SECRETS_PATH`.
- `INSTANCE` is required.
- Admins have to log in again, if the existing certificates are not copied during the upgrade.

## App

### New features

- Share searches, playbacks and download links, open shared links and continue the last playback.
- Show [announcements](../concepts/announcements) of the admins.
- Filter records by the group of a list.
- Android Auto works.
- The player uses the dark surface in dark mode, and the color scheme template is updated.
- The Android Gradle plugin is raised to 8.9.1.
- The app [moves to another domain](../setup/app#server-address) of the server in the background, after it checked that it is registered there.

### Bugfixes

- The player heats the device less, uses less battery and loads records with less work.
- The Android media notification is removed when the player is closed and no longer gets stuck.
- The app is offered for opening `.mml` files on Android and iOS.
- The app launches on iOS 27 with the UIScene lifecycle.
- The playback state is shown correctly.

### Breaking changes

- None. Sharing and announcements need the services of this release.

## Admin app

### New features

- **Sync** area to administrate [federation](../concepts/federation) partners with transfer progress, revoking a synchronization, address changes and an audit log table.
- Instance name and sync overview.
- Download links, share rules and share settings for [sharing](../concepts/sharing).
- Send [announcements](../concepts/announcements), change covers and show the licenses of the used packages.
- Filter for inactive clients and filter records by the group of a list.
- Login and form dialogs can be submitted with Enter.
- Covers load faster.
- The color scheme is updated and animations use Lottie instead of Rive.
- Registration and connection settings QR codes use the domain announced by the server in `Connection:ServerName`.
- The update check shows the changelog in the language of the app and opens the downloaded installer.
- Updated to Flutter 3.47 and current packages. The macOS app is built with the Swift Package Manager instead of CocoaPods.

### Bugfixes

- The app stays usable with servers without synchronization, and sharing is hidden on servers without sharing.
- The registration socket is closed when the dialog is closed.
- Records, that can not be deleted, are shown with their icon, and the folder filter works.
- Closing the upload dialog cancels the running upload without an error.
- The Windows app closes immediately.
- The filter field of the lists does not overflow next to the navigation.
- The `customize` script keeps the Windows window, when it sets the title.

### Breaking changes

- The admin app works with servers of the previous release, but federation and sharing need the services of this release.
- Forks: the Linux build job needs the packages `libx11-dev` and `libxi-dev`, see the [workflow](../customize/administration-app.md).

## Deployment

### New features

- TLS can be terminated by the reverse proxy (`PROXY_TLS=true`, default) or by an [external proxy](../setup/backend/operations#ssl-termination-at-an-external-proxy) (`PROXY_TLS=false`). Behind an external proxy the reverse proxy takes the client ip from `X-Forwarded-For` of the proxies in `TRUSTED_PROXY`.
- `PROXY_TLS=both` accepts direct clients with TLS on `SSL_PORT` and an external proxy over http on `HTTP_PORT` at the same time, e.g. while [moving to another domain](../setup/backend/operations#move-to-another-domain).
- The reverse proxy forwards Identity routes to Identity and all other requests to Media, and passes `X-Forwarded-Proto` to the services.
- The reverse proxy writes its [logs](../setup/backend/reverse-proxy#logs) to files in `PROXY_LOGS` instead of the console. Share links are not logged.
- Secrets of Identity and Media are read from files, see [Encryption and Signing](../setup/backend/certificates-and-keys#encryption-and-signing).

### Breaking changes

- The reverse proxy needs the new `default.conf.template` and the executable script `15-mml-listen.sh` next to it. The container stops with a hint, if the script is missing.
- The access log of the reverse proxy is not shown by `docker logs` anymore.
- `ENCRYPT_SECRET`, `SIGN_SECRET` and `FEDERATION_KEY_SECRET` are deprecated. They still work, if no secret file is configured.

## Upgrade from 3.x

This guide describes the changes admins have to make when updating an existing backend from 3.x to 4.0.0. New installations follow the [backend setup](../setup/backend) instead.

:::caution Backup
Create a backup of the databases, the records folder and the certificates before updating. See [Upgrading postgres version](../setup/backend/operations#create-dumps-of-all-databases-you-want-to-backup) on how to create database dumps.
:::

### 1. Stop the services

```bash
cd ~/medialib
sudo docker compose stop wekode.mml.reverseproxy wekode.mml.media wekode.mml.identity
```

### 2. Update the deployment files

Copy the new [`docker-compose.yml`](https://github.com/we-kode/mml.deployment/blob/develop/docker-compose.yml), [`default.conf.template`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/default.conf.template) and [`15-mml-listen.sh`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/15-mml-listen.sh) to the server. The template and the script belong into the folder `CONF_TEMPLATE`. Make the script executable and create the folder of the proxy logs:

```bash
chmod +x proxy/15-mml-listen.sh
mkdir -p proxy/logs
sudo chown -R 1001:1001 proxy/
```

The template contains the routes `/hub/federation` and `/media/s/` of the Media service. The script generates the listen configuration of the reverse proxy, see [SSL/TLS](../setup/backend/certificates-and-keys#ssltls). Set up the rotation of the proxy logs as described in [Logs](../setup/backend/reverse-proxy#logs).

Add the new values to the existing `.env` file and set the new image versions in `IDENTITY_VERSION` and `MEDIA_VERSION`:

```bash
## The system tenant name to be used e.g in federation. The INSTANCE value should not contain spaces.
INSTANCE=my-media-lib

## identity configuration section
## Optional. Paths to the files on host with the secrets to protect the encryption and signing certificates.
#ENCRYPT_SECRET_FILE=/home/mml/medialib/identity/encrypt.secret
#SIGN_SECRET_FILE=/home/mml/medialib/identity/sign.secret
## The path where the certificates of the identity are stored.
IDENTITY_SECRETS_PATH=/home/mml/medialib/identity/secrets

## media configuration section
## The path where the federation keys of the media service are stored.
MEDIA_SECRETS_PATH=/home/mml/medialib/media/secrets
## Optional. Path to the file on host with the secret to encrypt the federation keys stored in MEDIA_SECRETS_PATH.
#FEDERATION_KEY_SECRET_FILE=/home/mml/medialib/media/federation.secret

## proxy configuration section
## true: the proxy terminates TLS with the certificate CERT_NAME. false: TLS is terminated by an external proxy.
# PROXY_TLS=true
## Only used with PROXY_TLS=false. Ips or CIDRs of the external proxies.
# TRUSTED_PROXY=
## Path to the folder on host where the access.log and error.log of the proxy are written.
PROXY_LOGS=/home/mml/medialib/proxy/logs
```

:::danger Set the instance name before the first start
On the first start the Media service marks all existing records as owned by `INSTANCE`. Set the final name before starting the services and do not change it afterwards. The Media service stores the name on the first start and refuses to start with another name, see [Instance name](../setup/backend/prepare-server#instance-name). The name may contain letters, digits, `.`, `_` and `-` with up to 64 characters and must be unique among your partner instances.
:::

Create the secrets folders and set the user rights:

```bash
mkdir -p identity/secrets media/secrets
sudo chown -R 1001:1001 identity/secrets media/secrets
```

If you used `ENCRYPT_SECRET`, `SIGN_SECRET` or `FEDERATION_KEY_SECRET` before, move each secret unchanged into a file and set the matching `_FILE` variable instead, see [Encryption and Signing](../setup/backend/certificates-and-keys#encryption-and-signing). The variables still work, but the secrets are then visible in the environment of the containers.

### 3. Keep the identity certificates

Identity stores its certificates in `IDENTITY_SECRETS_PATH` and no longer reads them from the paths in `OpenId:EncryptionCert` and `OpenId:SigningCert`. Copy the existing certificates with the new file names, so existing logins stay valid:

```bash
cp certs/identity.sign.pfx identity/secrets/wekode.mml.signing.pfx
cp certs/identity.encrypt.pfx identity/secrets/wekode.mml.encryption.pfx
sudo chown 1001:1001 identity/secrets/*.pfx
```

If you skip this step, new certificates are created on the first start and all admins have to log in again. Registered clients are not affected, since they get new tokens with their client credentials.

When `ENCRYPT_SECRET_FILE` or `SIGN_SECRET_FILE` is set, the copied certificates are protected with the secret on the first start. Do not change the secrets afterwards.

### 4. Update the appsettings

#### Identity

In `identity/appsettings.json`:

- Remove `EncryptionCert` and `SigningCert` from the `OpenId` section.
- Rename the section `MassTransit` to `MessageBus`.
- Use the Redis connection string without TLS: `"DistributedCache": "wekode.mml.cache:6379,password=<password>"`.
- Optional: remove the `TLS` section, if TLS is terminated by the reverse proxy or an external proxy, see [SSL/TLS](../setup/backend/certificates-and-keys#ssltls).

```json
"OpenId": {
    "AccessTokenLifetimeMinutes": "60",
    "RefreshTokenLifetimeMinutes": "43200",
    "RefreshTokenReuseLeewaySeconds": "10",
    "TokenLifespanMinutes": "15",
    "CleanOrphanTokenDays": "1",
    "Issuer":  "https://<url>:<port>/"
  },
  "MessageBus": {
    ...
  },
```

#### Media

In `media/appsettings.json`:

- Remove `EncryptionCert` from the `OpenId` section. Media validates the tokens with the public keys of Identity.
- Rename the section `MassTransit` to `MessageBus`.
- Add the `Federation` section. Federation is always enabled and uses the address of `OpenId:Issuer`; set `PublicUrl` only if partners reach this instance at another address, see [Federation](../setup/backend/media#federation).
- Optional: remove the `TLS` section, if TLS is terminated by the reverse proxy or an external proxy, see [SSL/TLS](../setup/backend/certificates-and-keys#ssltls).

```json
"OpenId": {
    "Issuer": "https://<url>:<port>/"
  },
  "Federation": {
    "PublicUrl": "",
    "AllowPrivateNetworks": false,
    "KeysPath": "/secrets/federation",
    "KeyRotationDays": 90,
    "KeyPublishLeadDays": 7,
    "KeyRetireDays": 14,
    "ChunkSizeMb": 32,
    "MaxRecordSizeMb": 2048,
    "UploadPath": "/tmp/records/federation",
    "UploadRetentionDays": 7,
    "MaxOpenTransfers": 10
  },
  "MessageBus": {
    ...
  },
```

The certificate `identity.encrypt.pfx` is not needed by Media anymore.

### 5. Start the services

```bash
sudo docker compose pull
sudo docker compose up -d
```

The databases are migrated automatically on the first start. Check the logs of Identity and Media for errors:

```bash
sudo docker compose logs wekode.mml.identity wekode.mml.media
```

The queues of the previous message bus library are not used anymore. They can be removed from RabbitMQ after the services started successfully.

### 6. Update the apps

Install the 4.0.0 release of the [administration app](../setup/administration-app) and the [mobile app](../setup/app). Admins may have to log in again.

### 7. Use federation

Federation is enabled after the update without further configuration. Nobody can register without an invitation code created by an admin of this instance. To synchronize records:

1. Make sure `FILE_UPLOAD_LIMIT` in the `.env` file is larger than `ChunkSizeMb` of your partners (32 MB by default).
2. Register partners as described in [Federation](../concepts/federation#registration).

### 8. Use sharing

[Sharing](../concepts/sharing) needs the route `/media/s/` of the new reverse proxy template. Without it, links to searches and downloads do not work. Afterwards:

1. Create [share rules](../concepts/sharing#who-may-share) for the groups whose users should be allowed to share. Without rules users can not share.
2. Optional: adjust the look of the share pages in [`styling.json`](../setup/backend/media#style-the-share-pages), e.g. if you customized your app. The compose file of the deployment mounts the file from `MEDIA_STYLING`. Without the file the pages look like the unchanged app.
