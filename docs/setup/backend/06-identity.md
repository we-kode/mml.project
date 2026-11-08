---
sidebar_position: 7
title: "Step 6: Identity"
---

# Step 6: Identity

:::note You need
The app keys and secrets of [step 2](./02-certificates-and-keys.md), the database of [step 3](./03-database.md), Redis and RabbitMQ of [step 4](./04-cache-and-message-bus.md) and the [reverse proxy](./05-reverse-proxy.md).
:::

The [identity service](https://github.com/we-kode/mml.identity) is used for managing the users, clients and logins of [My Media Lib](/).

## Create folder
Create the folder where the configuration will be.

```bash
mkdir identity
```

## Configuration

Copy the [`default.appsettings.json`](https://github.com/we-kode/mml.identity/blob/master/Identity.API/default.appsettings.json) to `~/medialib/identity/appsettings.json` on server. Remove the `default.` part of the filename.

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

### Set issuer url to your domain and port you are using as ssl port.

```json {7}
"OpenId": {
    "AccessTokenLifetimeMinutes": "60",
    "RefreshTokenLifetimeMinutes": "43200",
    "RefreshTokenReuseLeewaySeconds": "10",
    "TokenLifespanMinutes": "15",
    "CleanOrphanTokenDays": "1",
    "Issuer":  "https://<url>:<port>/"
  },
```

### Replace the connection string with values you [defined](./03-database.md#identity-database-configuration) when creating the database for the service. And set the redis password you [defined](./04-cache-and-message-bus.md#redis-configuration) when setting up the cache service.

```json
"ConnectionStrings": {
    "IdentityConnection": "Server=wekode.mml.db;Port=5432;Database=identity;User Id=identity;Password=identity;",
    "DistributedCache": "wekode.mml.cache:6379,password=<password>"
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
    "StopTimeoutSeconds": 30
  },
```
### Create api client for media service

To allow the media service to validate access tokens one oauth client need to be generated, so the media service can send requests to the identity service. The values are just [random Guids](https://www.guidgen.com/). The clients defined here will be created automatically on startup.

```json {3,4}
"ApiClients": [
    {
      "ClientId": "<ClientId>",
      "ClientSecret": "<ClientSecret>"
    }
  ]
```
## Update .env file and start service

Update the required values in the `~/medialib/.env` file.

:::info Actual Version
Actual docker image can be found on [docker-hub](https://hub.docker.com/r/w3kod3/wekode.mml.identity/tags).
:::

```bash {5,8}
cat .env

## identity configuration section
## The docker tag to be used.
IDENTITY_VERSION=1.0.2
## Path and name on host machine where the appsettings is stored.
## for example /app/config/appsettings.json
IDENTITY_APPSETTINGS=/home/mml/medialib/identity/appsettings.json
## Optional. Paths to the files on host with the secrets to protect the encryption and signing certificates.
#ENCRYPT_SECRET_FILE=/home/mml/medialib/identity/encrypt.secret
#SIGN_SECRET_FILE=/home/mml/medialib/identity/sign.secret
## The path where the certificates of the identity are stored.
IDENTITY_SECRETS_PATH=/home/mml/medialib/identity/secrets
```

The [encryption and signing certificates](./02-certificates-and-keys.md#encryption-and-signing) are created in `IDENTITY_SECRETS_PATH` on the first start. Set user rights of the folders to the [docker user](./01-prepare-server.md#create-mml-user) and start the service.

```bash
mkdir -p identity/secrets
sudo chown -R 1001:1001 identity/
sudo docker compose up wekode.mml.identity -d
```

## Check

```bash
curl https://<url>:<port>/.well-known/openid-configuration
```

The answer is a JSON document whose `issuer` is your `OpenId:Issuer`. Otherwise check `sudo docker compose logs wekode.mml.identity`.

**Next:** [Step 7: Media](./07-media.md)
