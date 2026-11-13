---
sidebar_position: 4
title: "Step 3: Database"
---

# Step 3: Database

:::note You need
[Step 1](./01-prepare-server.md).
:::

## Create folders
As database server [postresql](https://www.postgresql.org/) is used. Each service has it's own database.
Create first some fodler to store configuration and databases persistence on host.

```bash
mkdir db db/secrets db/config db/data
```

## Database inital scripts
Copy the [database initial scripts](https://github.com/we-kode/mml.deployment/tree/develop/db/initdb.d) to the server into `~/medialib/db/initdb.d`. This scripts will create the databases for the services.
Make the scripts executable.

```bash
chmod u+x ~/medialib/db/initdb.d/identity-db.sh ~/medialib/db/initdb.d/media-db.sh
```

## Postgres configuration file
Copy the [postres configuration file](https://github.com/we-kode/mml.deployment/blob/develop/db/mml-postgres.default.conf) to `~/medialib/db/mml-postgres.conf`. Remove the `.default` part of the filename.
Here you can configure your database server on your needs or just use the default configuration.

## Root database user
Create an user and password file and enter your root db user and root db password

```bash
touch db/secrets/user
touch db/secrets/password
```

## [Identity](https://github.com/we-kode/mml.identity) database configuration
Create file with filename `identity.conf` and configure your user, password and database name for the [identity service](https://github.com/we-kode/mml.identity).

```bash
# create identity.conf with content
touch db/config/identity.conf

IDENTITY_DB=identity
IDENTITY_USR=identity
IDENTITY_PW=identity
```

## [Media](https://github.com/we-kode/mml.media) database configuration
Create file with filename `media.conf` and configure your user, password and database name for the [media service](https://github.com/we-kode/mml.media).

```bash
# create media.conf with content
touch db/config/media.conf

MEDIA_DB=media
MEDIA_USR=media
MEDIA_PW=media
```

## Update .env file and start service
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

:::tip
Set `POSTRES_VERSION` to a fixed version, e.g. `18.6`, instead of `latest`. A new major version of postgres can not start with the data of the old one. See [Update database](./operations.md#update-database) on how to update postgres later.
:::

Set user rights of the folder to the [docker user](./01-prepare-server.md#create-mml-user) and start the database service.

```bash
sudo chown -R 1001:1001 db/
sudo docker compose up wekode.mml.db -d
```

## Check

```bash
sudo docker compose ps wekode.mml.db
sudo docker compose logs wekode.mml.db | grep "ready to accept connections"
```

The container is running and the log contains `database system is ready to accept connections`.

**Next:** [Step 4: Cache and message bus](./04-cache-and-message-bus.md)
