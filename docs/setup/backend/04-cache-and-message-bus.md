---
sidebar_position: 5
title: "Step 4: Cache and message bus"
---

# Step 4: Cache and message bus

:::note You need
[Step 1](./01-prepare-server.md).
:::

## Cache

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

## Message bus

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

Set user rights of the folder to the [docker user](./01-prepare-server.md#create-mml-user) and start the service.

```bash
sudo chown -R 1001:1001 mbus/
sudo docker compose up wekode.mml.mbus -d
```

## Check

```bash
sudo docker compose ps wekode.mml.cache wekode.mml.mbus
```

Both containers are running. Note the Redis password and the RabbitMQ user for [step 6](./06-identity.md) and [step 7](./07-media.md).

**Next:** [Step 5: Reverse proxy](./05-reverse-proxy.md)
