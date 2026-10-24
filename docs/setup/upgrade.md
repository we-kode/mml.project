---
sidebar_position: 4
---

# Upgrade to the federation release

This guide describes the changes admins have to make when updating an existing backend from Identity 1.5 and Media 2.5 to the release with [federation](../concepts/federation). New installations follow the [backend setup](./backend) instead.

The release brings these changes:

- Records can be synchronized with partner instances ([federation](../concepts/federation)).
- Every instance needs a unique instance name.
- Identity issues JSON Web Tokens and creates its encryption and signing certificates itself.
- The services use .NET 10 and a new message bus library. The configuration section `MassTransit` is renamed to `MessageBus`.
- The admin app shows the new **Sync** area and record filters and needs the new release of the admin app.

:::caution Backup
Create a backup of the databases, the records folder and the certificates before updating. See [Upgrading postgres version](./backend#create-dumps-of-all-databases-you-want-to-backup) on how to create database dumps.
:::

## 1. Stop the services

```bash
cd ~/medialib
sudo docker compose stop wekode.mml.reverseproxy wekode.mml.media wekode.mml.identity
```

## 2. Update the deployment files

Copy the new [`docker-compose.yml`](https://github.com/we-kode/mml.deployment/blob/develop/docker-compose.yml) and [`default.conf.template`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/default.conf.template) to the server. The template contains the new route `/hub/federation`, which the admin app uses for notifications.

Add the new values to the existing `.env` file and set the new image versions in `IDENTITY_VERSION` and `MEDIA_VERSION`:

```bash
## The system tenant name to be used e.g in federation. The INSTANCE value should not contain spaces.
INSTANCE=my-media-lib

## identity configuration section
## Optional. Secrets to protect the encryption and signing certificates.
#ENCRYPT_SECRET=
#SIGN_SECRET=
## The path where the certificates of the identity are stored.
IDENTITY_SECRETS_PATH=/home/mml/medialib/identity/secrets

## media configuration section
## The path where the federation keys of the media service are stored.
MEDIA_SECRETS_PATH=/home/mml/medialib/media/secrets
## Optional. Secret to encrypt the federation keys stored in MEDIA_SECRETS_PATH.
#FEDERATION_KEY_SECRET=
```

:::danger Set the instance name before the first start
On the first start the Media service marks all existing records as owned by `INSTANCE`. Set the final name before starting the services and do not change it afterwards. The Media service stores the name on the first start and refuses to start with another name, see [Instance name](./backend#instance-name). The name may contain letters, digits, `.`, `_` and `-` with up to 64 characters and must be unique among your partner instances.
:::

Create the secrets folders and set the user rights:

```bash
mkdir -p identity/secrets media/secrets
sudo chown -R 1001:1001 identity/secrets media/secrets
```

## 3. Keep the identity certificates

Identity now stores its certificates in `IDENTITY_SECRETS_PATH` and no longer reads them from the paths in `OpenId:EncryptionCert` and `OpenId:SigningCert`. Copy the existing certificates with the new file names, so existing logins stay valid:

```bash
cp certs/identity.sign.pfx identity/secrets/wekode.mml.signing.pfx
cp certs/identity.encrypt.pfx identity/secrets/wekode.mml.encryption.pfx
sudo chown 1001:1001 identity/secrets/*.pfx
```

If you skip this step, new certificates are created on the first start and all admins have to log in again. Registered clients are not affected, since they get new tokens with their client credentials.

When `ENCRYPT_SECRET` or `SIGN_SECRET` is set, the copied certificates are protected with the secret on the first start. Do not change the secrets afterwards.

## 4. Update the appsettings

### Identity

In `identity/appsettings.json`:

- Remove `EncryptionCert` and `SigningCert` from the `OpenId` section.
- Rename the section `MassTransit` to `MessageBus`.

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

### Media

In `media/appsettings.json`:

- Remove `EncryptionCert` from the `OpenId` section. Media validates the tokens with the public keys of Identity.
- Rename the section `MassTransit` to `MessageBus`.
- Add the `Federation` section. Federation is always enabled and uses the address of `OpenId:Issuer`; set `PublicUrl` only if partners reach this instance at another address, see [Federation](./backend#federation).

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

## 5. Start the services

```bash
sudo docker compose pull
sudo docker compose up -d
```

The databases are migrated automatically on the first start. Check the logs of Identity and Media for errors:

```bash
sudo docker compose logs wekode.mml.identity wekode.mml.media
```

The queues of the previous message bus library are not used anymore. They can be removed from RabbitMQ after the services started successfully.

## 6. Update the admin app

Install the new release of the [administration app](./administration-app). Admins may have to log in again.

## Use federation

Federation is enabled after the update without further configuration. Nobody can register without an invitation code created by an admin of this instance. To synchronize records:

1. Make sure `FILE_UPLOAD_LIMIT` in the `.env` file is larger than `ChunkSizeMb` of your partners (32 MB by default).
2. Register partners as described in [Federation](../concepts/federation#registration).
