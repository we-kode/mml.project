---
sidebar_position: 3
title: "Step 2: Certificates and keys"
---

# Step 2: Certificates and keys

:::note You need
[Step 1](./01-prepare-server.md) and a domain, which points to your server or your external proxy.
:::

## SSL/TLS

The apps always communicate with the backend over https. Where TLS is terminated depends on your infrastructure:

| Variant | Reverse proxy | Identity and Media | Certificates |
| --- | --- | --- | --- |
| TLS everywhere (default) | `PROXY_TLS=true` | `TLS` with pfx certificate | `.crt`, `.key` and `.pfx` |
| TLS only at the reverse proxy | `PROXY_TLS=true` | no `TLS:Cert`, http in the docker network | `.crt` and `.key` |
| TLS at an [external proxy](./operations.md#ssl-termination-at-an-external-proxy) | `PROXY_TLS=false` | no `TLS:Cert`, http in the docker network | none, the external proxy owns the certificate |
| Both at the same time, e.g. while [moving to another domain](./operations.md#move-to-another-domain) | `PROXY_TLS=both` | like the variants above | `.crt` and `.key` of the old domain |

Identity and Media listen on http, if no `TLS:Cert` is configured in their appsettings. Then set `IDENTITY_API_ADDRESS` and `MEDIA_API_ADDRESS` in the `.env` file to `http://wekode.mml.identity` and `http://wekode.mml.media`. Never publish the ports of the services. PostgreSQL, Redis and RabbitMQ communicate unencrypted inside the docker network in all variants.

For the variants with TLS, generate a ssl/tls certificate based on your needs for your custom domain and copy it to the certs folder. Without certificates `VOL_CERTS` can point to an empty folder.

```bash
mkdir ~/medialib/certs
# copy <CERT_NAME>.crt, <CERT_NAME>.key and the .pfx file into ~/medialib/certs
```

Update the required values in the `~/medialib/.env` file.

```bash {5,7}
cat .env

## ssl certification configuration
## path, where to find the ssl certificate on host
VOL_CERTS=/home/mml/medialib/certs
## the ssl certificate name on host for .crt and .key without extension.
CERT_NAME=domain.name
```

## Encryption and Signing

The [identity service](./06-identity.md) signs and encrypts its tokens with two certificates. They are created automatically on the first start in the folder `IDENTITY_SECRETS_PATH` as `wekode.mml.signing.pfx` and `wekode.mml.encryption.pfx`. No certificate has to be generated manually.

Keep this folder when updating the service. If the certificates are lost, new ones are created and all [admins](../../concepts/admins.mdx) have to log in again.

The certificates can be protected with a password. Store each secret in its own file and set the paths in `SIGN_SECRET_FILE` and `ENCRYPT_SECRET_FILE` of the `.env` file. The files are mounted read-only into the container, so the secrets are not part of the environment of the container. Certificates created without password are protected automatically when a secret is set later. Do not change a secret afterwards, otherwise the certificate cannot be read anymore.

```bash
openssl rand -base64 32 > identity/sign.secret
openssl rand -base64 32 > identity/encrypt.secret
sudo chown 1001:1001 identity/*.secret
sudo chmod 600 identity/*.secret
```

The variables `SIGN_SECRET` and `ENCRYPT_SECRET` with the secret itself are still supported, if no file is configured. Move an existing secret into a file without changing it, e.g. `printf '%s' '<secret>' > identity/sign.secret`.

## App keys

App keys will be used to verify requests to the backend. Only requests containing the app-key in the header will be accepted. Two app keys are required. One for the admin app and one for the mobile app.
The app keys are Guids. [Generate](https://www.guidgen.com/) two random Guids as app keys.

## Check

```bash
ls -l ~/medialib/certs ~/medialib/identity
```

Depending on the [variant](#ssltls) `certs` contains `CERT_NAME.crt`, `CERT_NAME.key` and the `.pfx` file, the optional secret files are owned by `1001` and two app keys are noted for the next steps.

**Next:** [Step 3: Database](./03-database.md)
