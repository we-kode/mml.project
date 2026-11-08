---
sidebar_position: 8
title: "Step 7: Media"
---

# Step 7: Media

:::note You need
The app keys of [step 2](./02-certificates-and-keys.md), the database of [step 3](./03-database.md), RabbitMQ of [step 4](./04-cache-and-message-bus.md) and the api client of [step 6](./06-identity.md#create-api-client-for-media-service).
:::

The [media service](https://github.com/we-kode/mml.media) is used for managing the uploaded [records](../../concepts/records.mdx) of [My Media Lib](/).

## Create folder

Create the folder where the configuration and uploaded [records](../../concepts/records.mdx) will be.

```bash
mkdir media media/records
```

## Configuration

Copy the [`default.appsettings.json`](https://github.com/we-kode/mml.media/blob/master/Media.API/default.appsettings.json) to `~/medialib/media/appsettings.json` on server. Remove the `default.` part of the filename.

### Replace the [app keys](./02-certificates-and-keys.md#app-keys).

```bash
cat ~/medialib/identity/appsettings.json

...
```
```json
  "ADMIN_APP_KEY": "<admin_app_key>", 
  "APP_KEY": "<app_key>",
```
```bash
...
```

### Replace the name of the pfx certificate and set your pfx password.

```json
"TLS": {
    "Cert": "/certs/<name of cert>.pfx",
    "Password": "<password>"
  },
```

Remove the `TLS` section or leave `Cert` empty to run the service on http, if TLS is terminated by the [reverse proxy or an external proxy](./02-certificates-and-keys.md#ssltls). The service trusts the forwarded headers of the reverse proxy from private networks. To restrict them, set the networks of the reverse proxy in `ForwardedHeaders:KnownNetworks`, e.g. the subnet of the docker network `wekode.mml`.

```json
"ForwardedHeaders": {
    "KnownNetworks": [ "172.18.0.0/16" ]
  },
```

### Replace the connection string with values you [defined](./03-database.md#media-database-configuration) when creating the database for the service.

```json
"ConnectionStrings": {
    "MediaConnection": "Server=wekode.mml.db;Port=5432;Database=media;User Id=media;Password=media;"
  },
```

### Set issuer url to your domain and port you are using as ssl port.

```json {2}
"OpenId": {
    "Issuer": "https://<url>:<port>/"
  },
```

### Set the api client id and secret you [defined](./06-identity.md#create-api-client-for-media-service) when setting up the identity service.

```json {2,3}
 "ApiClient": {
    "ClientId": "<ClientId>",
    "ClientSecret": "<ClientSecret>"
  },
```

### Replace the rabbitmq user and password with the values you [defined](./04-cache-and-message-bus.md#message-bus) when setting up the message bus service.

```json {3,4}
"MessageBus": {
    "Host": "wekode.mml.mbus",
    "User": "guest",
    "Password": "guest",
    "VirtualHost": "/",
    "WaitUntilStarted": true,
    "StartTimeoutSeconds": 10,
    "StopTimeoutSeconds": 30,
    "ConcurrentMessageLimit":  10
  }
```

### Records

```json
"Records": {
    "MaxCoverSizeMb": 8
  },
```

| Setting | Description |
| --- | --- |
| `MaxCoverSizeMb` | Largest cover an admin can set in the record details, 8 MB by default. Larger images are rejected. Covers from the id3 tags of uploaded records and from partners are not limited. The cover is sent base64 encoded, so the request is about a third larger than the image and must stay below the `FILE_UPLOAD_LIMIT` of the reverse proxy. |

### Share

```json
"Share": {
    "MaxRecordsPerLink": 200,
    "StylingPath": "/configs/styling.json"
  },
```

| Setting | Description |
| --- | --- |
| `MaxRecordsPerLink` | Largest number of records in one [download link](../../concepts/sharing.mdx), 200 by default, at most 10000. The apps show the limit when a selection is too large. |
| `StylingPath` | Path of the [styling of the share pages](#style-the-share-pages) inside the container. Keep the default and mount another file with `MEDIA_STYLING` instead. |

### Federation

[Federation](../../concepts/federation.mdx) synchronizes records with other My Media Lib instances. It is always enabled. Partners reach this instance at the issuer address configured in `OpenId:Issuer`. Set `PublicUrl` only if partners use another public HTTPS address, with the [ssl port](./05-reverse-proxy.md) if it is not 443.

```json
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
```

| Setting | Description |
| --- | --- |
| `PublicUrl` | Public HTTPS address partners reach this instance at. Empty uses `OpenId:Issuer`. When the address changes, linked partners are informed after the next start, see [address changes](../../concepts/federation.mdx#address-changes). |
| `AllowPrivateNetworks` | Allows partners with addresses in private networks, e.g. in a local network. Disabled by default. |
| `KeysPath` | Folder of the signing keys. Must be inside the secrets volume `MEDIA_SECRETS_PATH` configured below. |
| `KeyRotationDays`, `KeyPublishLeadDays`, `KeyRetireDays` | Rotation of the signing keys: a new key every 90 days, published 7 days before use, the old key is removed 14 days later. |
| `ChunkSizeMb` | Size of the parts records are sent in. Must be smaller than the `FILE_UPLOAD_LIMIT` of every partner. |
| `MaxRecordSizeMb` | Largest record accepted from partners. |
| `UploadPath`, `UploadRetentionDays` | Folder of unfinished transfers from partners and the days they are kept without progress. |
| `MaxOpenTransfers` | Unfinished transfers one partner may have at the same time. Further transfers are rejected until one is finished or removed. |

:::caution Instance name
Partners are identified by the `INSTANCE` name in the `.env` file. Every instance needs a unique name consisting of letters, digits, `.`, `_` or `-` with up to 64 characters. Do not change the name after the first start, the Media service refuses to start with another name, see [Instance name](./01-prepare-server.md#instance-name).
:::

## Style the share pages

The public pages of [share links](../../concepts/sharing.mdx) show the title and use the colors of your mobile app, so they look like the app. They are configured in the file `styling.json`, which is filled with the title and the colors of the unchanged app. You only need it, if you [customized the app](../../customize/android.md) or want other values.

Copy [`styling.json`](https://github.com/we-kode/mml.deployment/blob/develop/media/styling.json) to `~/medialib/media/styling.json` on the server and adjust the values. The file is read when the service starts.

```json
{
  "title": {
    "default": "Meine Mediathek",
    "de": "Meine Mediathek",
    "en": "My Media Lib",
    "ru": "Моя Медиятека"
  },
  "colors": {
    "light": {
      "surface": "#FDFBFF",
      "onSurface": "#1A1C1E",
      "surfaceContainerHighest": "#E0E2EC",
      "onSurfaceVariant": "#43474E",
      "primary": "#245FA6",
      "onPrimary": "#FFFFFF",
      "primaryContainer": "#D5E3FF",
      "onPrimaryContainer": "#001B3C",
      "outline": "#74777F"
    },
    "dark": {
      "surface": "#1A1C1E",
      "onSurface": "#E3E2E6",
      "surfaceContainerHighest": "#43474E",
      "onSurfaceVariant": "#C4C6CF",
      "primary": "#A8C8FF",
      "onPrimary": "#003061",
      "primaryContainer": "#004689",
      "onPrimaryContainer": "#D5E3FF",
      "outline": "#8E9199"
    }
  }
}
```

| Setting | Description |
| --- | --- |
| `title` | Title of the app per language, as set in the `app.cfg` of your app. `default` is used for all languages which are not listed. |
| `colors` | Colors of the light and dark theme as hex values like `#245FA6`. The names are the names of the color roles in the `lib_color_schemes.g.dart` of your app, so you can copy the values from there. Invalid or missing values use the default. |

Set `MEDIA_STYLING` in the `.env` file to the path of the file and restart the service, see below. Without the setting or with a missing or invalid file the defaults are used.

## Update .env file and start service
Update the required values in the `~/medialib/.env` file.

:::info Actual Version
Actual docker image can be found on [docker-hub](https://hub.docker.com/r/w3kod3/wekode.mml.media/tags).
:::

```bash {5,8,10}
cat .env

## media configuration section
## The docker tag to be used.
MEDIA_VERSION=1.2.1
## Path and name on host machine where the appsettings is stored.
## for example /app/config/appsettings.json
MEDIA_APPSETTINGS=/home/mml/medialib/media/appsettings.json
## Path to the folder on host where to backup the uploaded and indexed records.
VOL_RECORDS=/home/mml/medialib/media/records
## The path where the federation keys of the media service are stored.
MEDIA_SECRETS_PATH=/home/mml/medialib/media/secrets
## Optional. Path and name on host machine where the styling of the share pages is stored.
#MEDIA_STYLING=/home/mml/medialib/media/styling.json
## Optional. Path to the file on host with the secret to encrypt the federation keys stored in MEDIA_SECRETS_PATH.
#FEDERATION_KEY_SECRET_FILE=/home/mml/medialib/media/federation.secret
```

The signing keys of the [federation](../../concepts/federation.mdx) are created automatically in `MEDIA_SECRETS_PATH`. Keep this folder when updating the service, otherwise partners have to load new keys. The folder must be writable by the [docker user](./01-prepare-server.md#create-mml-user); the service cannot create keys otherwise and federation requests fail.

The secret in the file `FEDERATION_KEY_SECRET_FILE` encrypts the stored keys. Create it like the [secrets of the identity service](./02-certificates-and-keys.md#encryption-and-signing), e.g. `openssl rand -base64 32 > media/federation.secret`. `FEDERATION_KEY_SECRET` with the secret itself is still supported, if no file is configured. Keys stored without encryption are encrypted automatically when the secret is set later. If the secret is changed or removed, existing encrypted keys cannot be read anymore and the service reports an error. In this case delete the files in `MEDIA_SECRETS_PATH`: new keys are created and partners load them automatically.

Set user rights of the folders to the [docker user](./01-prepare-server.md#create-mml-user) and start the service.

```bash
mkdir -p media/secrets
sudo chown -R 1001:1001 media/
sudo chown -R 1001:1001 media/records
sudo chown -R 1001:1001 media/secrets
sudo docker compose up wekode.mml.media -d
```

## Check

```bash
sudo docker compose ps wekode.mml.media
sudo docker compose logs wekode.mml.media
```

The container is running and the log shows no errors, e.g. about the `INSTANCE` name, the database or the message bus.

**Next:** [Step 8: Start and first admin](./08-start-and-first-admin.md)
