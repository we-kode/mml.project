---
sidebar_position: 1
---

# Backend

:::caution Security
Securing and hardening of your server and infrastructure is up to you and will not be covered in this documentation.
:::

You can install the backend on a server you like. Its your choice. You can use [kubernetes](https://kubernetes.io/), [.net](https://learn.microsoft.com/en-us/dotnet/framework/deployment/) or [docker compose](https://docs.docker.com/compose/) to deploy the backend services. In this documentation we will focus only on the setup of the backend with [docker compose](https://docs.docker.com/compose/) on a [ubuntu 22.05 LTS](https://releases.ubuntu.com/22.04/). Here we show you a step by setp guide you can use to setup the backend manually. Feel free to automate the process. However we do not provide a setup script.

The backend consists of multple services which need to be setup seperate. We provide one [mono docker-compose file and a default .env-configuration](https://github.com/we-kode/mml.deployment) file.
In the [.env](https://github.com/we-kode/mml.deployment/blob/develop/.env) file defaults are defined. Feel free to change the configuration on your neeeds.

:::info
We assume that you know how to use linux and [docker compose](https://docs.docker.com/compose/). If not, first look at official docu of [docker compose](https://docs.docker.com/compose/).
:::

## Copy monodeploy files

In this documentation all files and folders will be placed in `~/medialib`. Create this folder first.

```bash
mkdir ~/medialib
cd ~/medialib
```

Copy [`docker-compose.yml`](https://github.com/we-kode/mml.deployment/blob/develop/docker-compose.yml) and the [`.env`](https://github.com/we-kode/mml.deployment/blob/develop/.env) from the repository to `~/medialib` on server.

## Create mml user

All docker contaienrs will run for user id `1001` and group id `1001`. So cretae group and user first.

```bash
sudo groupadd -r -g 1001 mml && sudo useradd -r -d /nonexistent -s /bin/false -u 1001 -g 1001 mml
```

## Install docker

To install docker and create the docker network `wekode.mml` run following commands.

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -a -G mml media
sudo docker network create wekode.mml
```

## Configure firewall (optional)

Default the ssl port `443` will be used for extern communication. Create firewall rules based on you infrastructure and your needs. We do not provide any suggestions on this.
You are responsible for the security of your infrastructure.

## Domain and certificates

### SSL/TLS

All services are running using ssl/tls encryption. We need a fullchain cert with it's private key and a pfx cert file to run the service.

Generate a ssl/tls certificate based on your needs for your custom domain and copy it to the certs folder.

```bash
touch ~/medialib/certs
*.crt *.key *.pfx
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

### Encryption and Signing

Two additional certificates need to be generated named `identity.encrypt.pfx` and `identity.sign.pfx`. Place them in the `~/medialib/certs` folder on server. Please check the [official documentation](https://documentation.openiddict.com/) on [how to generate](https://documentation.openiddict.com/configuration/encryption-and-signing-credentials.html#registering-a-certificate-recommended-for-production-ready-scenarios) them.

## Configure database service

### Create folders
As database server [postresql](https://www.postgresql.org/) is used. Each service has it's own database.
Create first some fodler to store configuration and databases persistence on host.

```bash
mkdir db db/secrets db/config db/data
```

### Database inital scripts
Copy the [database initial scripts](https://github.com/we-kode/mml.deployment/tree/develop/db/initdb.d) to the server into `~/medialib/db/initdb.d`. This scripts will create the databases for the services.
Make the scripts executable.

```bash
chmod u+x ~/medialib/db/initdb.d/identity-db.sh ~/medialib/db/initdb.d/media-db.sh
```

### Postgres configuration file
Copy the [postres configuration file](https://github.com/we-kode/mml.deployment/blob/develop/db/mml-postgres.default.conf) to `~/medialib/db/mml-postgres.conf`. Remove the `.default` part of the filename.
Here you can configure your database server on your needs or just use the default configuration.

### Root database user
Create an user and password file and enter your root db user and root db password

```bash
touch db/secrets/user
touch db/secrets/password
```

### [Identity](https://github.com/we-kode/mml.identity) database configuration
Create file with filename `identity.conf` and configure your user, password and database name for the [identity service](https://github.com/we-kode/mml.identity).

```bash
# create identity.conf with content
touch db/config/identity.conf

IDENTITY_DB=identity
IDENTITY_USR=identity
IDENTITY_PW=identity
```

### [Media](https://github.com/we-kode/mml.media) database configuration
Create file with filename `media.conf` and configure your user, password and database name for the [media service](https://github.com/we-kode/mml.media).

```bash
# create media.conf with content
touch db/config/media.conf

MEDIA_DB=media
MEDIA_USR=media
MEDIA_PW=media
```

### Update .env file and start service
Update the required values in the `~/medialib/.env` file.

```bash {7,9,11,13,15,17}
cat .env

## db configuration section
## The docker tag to be used.
# POSTRES_VERSION=latest
## Path to the file on host where the root user credentials are stored.
SECRETS_VOL=/home/mml/medialib/db/secrets
## Path to the file on host where the root user password is stored.
POSTGRES_PASSWORD_FILE=password
## Path to the file on host where the root user name is stored.
POSTGRES_USER_FILE=user
## Path to the file of tzhe postres configuration file on host based on the mml-postgres.default.conf
PG_CONFIG_VOL=/home/mml/medialib/db/mml-postgres.conf
## Path to the database persistent data on host.
PGDATA_VOL=/home/mml/medialib/db/data
## Path to the folder on host where to persist db configs for dbs and users (configured files in ./db/default-db-configs).
DB_CONFIG_VOL=/home/mml/medialib/db/config
```

Set user rights of the folder to the [docker user](#create-mml-user) and start the database service.

```bash
sudo chown -R 1001:1001 db/
sudo docker compose up wekode.mml.db -d
```

## Configure cache service

[Redis](https://redis.io/) is used as cache. Setup redis with following steps.

### Create folder
Create the folder where the cache configuration will be.

```
mkdir cache
```

### Redis configuration
Copy the [`default.redis.conf`](https://github.com/we-kode/mml.deployment/blob/develop/cache/default.redis.conf) file to `~/medialib/cache/redis.conf`.  Remove the `default.` part of the filename. 
Replace `<password>` with your own password.

### Update .env file and start service
Update the required values in the `~/medialib/.env` file.

```bash {7}
cat .env

## redis cache configuration section
## The docker tag to be used.
#REDIS_VERSION=latest
## Path to the folder on host which stores the default.redis.conf file
CONFIG_PATH=/home/mml/medialib/cache
```

The docker of the redis image runs for user with id `999`. Update the user rights of the folder to the redis user and group `999` and start the cache service.

```bash
sudo chown -R 999:999 cache/
sudo docker compose up wekode.mml.cache -d
```

## Configure message bus

[RabbitMQ](https://www.rabbitmq.com/) is used as message bus between backend services.

### Create folder
Create the folder where the configuration will be.

```bash
mkdir mbus
```

### Configuration

Copy [`enabled_plugins`](https://github.com/we-kode/mml.deployment/blob/develop/mbus/enabled_plugins) to `~/medialib/mbus/enabled_plugins` on the server. Copy [`default.rebbitmq.conf`](https://github.com/we-kode/mml.deployment/blob/develop/mbus/default.rabbitmq.conf) to `~/medialib/mbus/rabbitmq.conf` on the server. Remove the `default.` part of the filename.
Change the default user `guest` and password `guest` in `rabbitmq.conf`.

### Update .env file and start service
Update the required values in the `~/medialib/.env` file.

```bash {7,9}
cat .env

## mbus configuration section
## The docker tag to be used for the rabbitmq image.
# MBUS_VERSION=latest
## Path to the enabled_plugins file on host.
ENABLED_PLUGINS_FILE=/home/mml/medialib/mbus/enabled_plugins
## Path to the default.rabbitmq.conf file on host.
CONFIG_FILE=/home/mml/medialib/mbus/rabbitmq.conf
```

Set user rights of the folder to the [docker user](#create-mml-user) and start the service.

```bash
sudo chown -R 1001:1001 mbus/
sudo docker compose up wekode.mml.mbus -d
```

## Configure reverse proxy

[Nginx](https://www.nginx.com/) is used as reverse proxy and api gateway. This is the entrypoint to the backend from extern requests of the admin and mobile app.

### Create folder
Create the folder where the configuration will be.

```bash
mkdir proxy
```

### Configuration

Copy [`default.conf.template`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/default.conf.template) to `~/medialib/proxy\default.conf.template` on the server.

### Update .env file and start service

Update the required values in the `~/medialib/.env` file.

```bash {7,11}
cat .env

## proxy configuration section
## The docker tag to be used.
# NGINX_VERSION=latest
## The ssl port on the host machine for requests to the mml-app from extern. Recomended to be changed to another port.
SSL_PORT=5555
## The port the reverse proxy is listen on in the docker file.
#INTERN_SSL_PORT=5050
## Path to the folder where the default.conf.template file is stored on host.
CONF_TEMPLATE=/home/media/medialib/proxy
## Upload file limit to prevent huge files to be uplaoded to server.
#FILE_UPLOAD_LIMIT=100m
...
```

Set user rights of the folder to the [docker user](#create-mml-user) and start the service.

```bash
sudo chown -R 1001:1001 proxy/
sudo docker compose up wekode.mml.reverseproxy -d
```

## Generate App Keys

App keys will be used to verify requests to the backend. Only requests containing the app-key in the header will be accepted. Two app keys are required. One for the admin app and one for the mobile app.
The app keys are Guids. [Generate](https://www.guidgen.com/) two random Guids as app keys.

## Configure identity service

The [identity service](https://github.com/we-kode/mml.identity) is used for managing the users, clients and logins of [My Media Lib](../intro).

### Create folder
Create the folder where the configuration will be.

```bash
mkdir identity
```

### Configuration

Copy the [`default.appsettings.json`](https://github.com/we-kode/mml.identity/blob/master/Identity.API/default.appsettings.json) to `~/medialib/identity/appsettings.json` on server. Remove the `default.` part of the filename.

#### Replace the [app keys](#generate-app-keys).

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

#### Replace the name of the pfx certificate and set your pfx password.

```json
"TLS": {
    "Cert": "/certs/<name of cert>.pfx",
    "Password": "<password>"
  },
```

#### Set issuer url to your domain and port you are using as ssl port.

```json {9}
"OpenId": {
    "EncryptionCert": "/certs/identity.encrypt.pfx",
    "SigningCert": "/certs/identity.sign.pfx",
    "AccessTokenLifetimeMinutes": "60",
    "RefreshTokenLifetimeMinutes": "43200",
    "RefreshTokenReuseLeewaySeconds": "10",
    "TokenLifespanMinutes": "15",
    "CleanOrphanTokenDays": "1",
    "Issuer":  "https://<url>:<port>/"
  },
```

#### Replace the connection string with values you [defined](#identity-database-configuration) when creating the database for the service. And set the redis password you [defined](#redis-configuration) when setting up the cache service.

```json
"ConnectionStrings": {
    "IdentityConnection": "Server=wekode.mml.db;Port=5432;Database=identity;User Id=identity;Password=identity;",
    "DistributedCache": "wekode.mml.cache:7379,password=<password>"
  },
```

#### Replace the rabbitmq user and password with the values you [defined](#configure-message-bus) when setting up the message bus service.

```json {3,4}
"MassTransit": {
    "Host": "wekode.mml.mbus",
    "User": "guest",
    "Password": "guest",
    "VirtualHost": "/",
    "WaitUntilStarted": true,
    "StartTimeoutSeconds": 10,
    "StopTimeoutSeconds": 30
  },
```
#### Create api client for media service

To allow the media service to validate access tokens one oauth client need to be generated, so the media service can send requests to the identity service. The values are just [random Guids](https://www.guidgen.com/). The clients defined here will be created automatically on startup.

```json {3,4}
"ApiClients": [
    {
      "ClientId": "<ClientId>",
      "ClientSecret": "<ClientSecret>"
    }
  ]
```
### Update .env file and start service

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
```

Set user rights of the folder to the [docker user](#create-mml-user) and start the service.

```bash
sudo chown -R 1001:1001 identity/
sudo docker compose up wekode.mml.identity -d
```

## Configure media service

The [media service](https://github.com/we-kode/mml.media) is used for managing the uploaded [records](../concepts/records) of [My Media Lib](../intro).

### Create folder

Create the folder where the configuration and uploaded [records](../concepts/records) will be.

```bash
mkdir media media/records
```

### Configuration

Copy the [`default.appsettings.json`](https://github.com/we-kode/mml.media/blob/master/Media.API/default.appsettings.json) to `~/medialib/media/appsettings.json` on server. Remove the `default.` part of the filename.

#### Replace the [app keys](#generate-app-keys).

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

#### Replace the name of the pfx certificate and set your pfx password.

```json
"TLS": {
    "Cert": "/certs/<name of cert>.pfx",
    "Password": "<password>"
  },
```

#### Replace the connection string with values you [defined](#media-database-configuration) when creating the database for the service.

```json
"ConnectionStrings": {
    "MediaConnection": "Server=wekode.mml.db;Port=5432;Database=media;User Id=media;Password=media;"
  },
```

#### Set issuer url to your domain and port you are using as ssl port.

```json {3}
"OpenId": {
    "EncryptionCert": "/etc/ssl/certs/identity.encrypt.pfx",
    "Issuer": "https://<url>:<port>/"
  },
```

#### Set the api client id and secret you [defined](#create-api-client-for-media-service) when setting up the identity service.

```json {2,3}
 "ApiClient": {
    "ClientId": "<ClientId>",
    "ClientSecret": "<ClientSecret>"
  },
```

#### Replace the rabbitmq user and password with the values you [defined](#configure-message-bus) when setting up the message bus service.

```json {3,4}
"MassTransit": {
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

### Update .env file and start service
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
```

Set user rights of the folder to the [docker user](#create-mml-user) and start the service.

```bash
sudo chown -R 1001:1001 media/
sudo chown -R 1001:1001 media/records
sudo docker compose up wekode.mml.media -d
```

## Start backend

You can now start all services.

```bash
docker compose up -d 
```

## Create first admin client and user

No default user exists at the beginning. First you have to create one. It can be done with the command line interface inside the [mml.identity](https://github.com/we-kode/mml.identity) project. When the service is running inside docker the call will be:

```bash
sudo docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# create
```

You will be ask for a username and a password. If no admin app client id exists already, a new one will be created and the client id will be printed on the console.

:::info Password length
The password of one admin user must be at least 12 characters long. Shorter passwords are not accepted.
:::

### Manage admin clients

You can install the admin app on several computers for example if you have multiple [admins](../concepts/admins). The [admin users](../concepts/admins) can be managed in your admin app.
If you want to give them a different client id, you can generate a new one by using the command line interface inside the [mml.identity](https://github.com/we-kode/mml.identity) project.

Admin clients can be created, listed and removed by the command line interface. To create one client hwne the service is running in docker call

```bash
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-create
```

To list all admin client ids call:

```bash
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-list
```

And to remove one client call and replace `<client id>` with your client id you want to remove:

```bash
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-remove <client id>
```