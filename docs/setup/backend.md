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

```
mkdir ~/medialib
cd ~/medialib
```

Copy [`docker-compose.yml`](https://github.com/we-kode/mml.deployment/blob/develop/docker-compose.yml) and the [`.env`](https://github.com/we-kode/mml.deployment/blob/develop/.env) from the repository to `~/medialib` on server.

## Create mml user

All docker contaienrs will run for user id `1001` and group id `1001`. So cretae group and user first.

```
sudo groupadd -r -g 1001 mml && sudo useradd -r -d /nonexistent -s /bin/false -u 1001 -g 1001 mml
```

## Install docker

To install docker and create the docker network `wekode.mml` run following commands.

```
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

## Domain and SSL/TLS certificates

All services are running using ssl/tls encryption. We need a fullchain cert with it's private key and a pfx cert file to run the service.

Generate a ssl/tls certificate based on your needs for your custom domain and copy it to the certs folder.

```
touch ~/medialib/certs
*.crt *.key *.pfx
```

## Configure database service

=>

```
cd ~/medialib
mkdir db
mkdir db/secrets
mkdir db/config
sudo mkdir /mnt/media/data
scp -R ./db/initdb.d ~/medialib/db/initdb.d
chmod u+x ~/medialib/db/initdb.d/identity-db.sh ~/medialib/db/initdb.d/media-db.sh
scp ./db/mml-postres.default.conf ~/medialib/db/mml-postres.conf

# create user and password file and enter your root db user and root db password
touch db/secrets/user
touch db/secrets/password

# create identity.conf with content
touch db/config/identity.conf

# create media.conf mit content
touch db/config/media.conf
nano .env
sudo chown -R 1001:1001 db/
sudo docker compose up wekode.mml.db -d
```

## Configure cache service

```
mkdir cache
scp default.redis.conf ~/medialib/cache/redis.conf
# change password in redis.conf
# enter values in .env in redis section
sudo chown -R 999:999 cache/
sudo docker compose up wekode.mml.cache -d
```

## Configure message bus

```
mkdir mbus
scp enabled_plugins ~/medialib/mbus/enabled_plugins
scp default.rabbitmq.conf ~/medialib/mbus/rabbitmq.conf
# change deafult user and password in rabitmq.conf
# enter values in .env in mbus section
sudo chown -R 1001:1001 mbus/
sudo docker compose up wekode.mml.mbus -d
```

## Configure reverse proxy

```
mkdir proxy
scp default.conf.temnplate ~/medialib/proxy
# enter values in .env file
# SSL_PORT to 18188
# enter values in .env file
sudo chown -R 1001:1001 proxy/
sudo docker compose up wekode.mml.reverseproxy -d
```

## Configure identity service

docker-hub reference

```
scp Identity.API/default.appsettings.json ~/medialib/identity/appsettings.json
# enter values in appsettings
# enter values in .env
sudo chown -R 1001:1001 identity/
sudo docker compose up wekode.mml.identity -d
sudo docker exec -it wekode.mml.identity /bin/bash
create
```

## Configure media service

docker-hub reference

```
mkdir media
scp Media.API/default.appsettings.json ~/medialib/media/appsettings.json
sudo mkdir /mnt/media/records
# enter values in appsettings
# enter values in .env
sudo chown -R 1001:1001 media/
sudo chown -R 1001:1001 /mnt/media/records
sudo docker compose up wekode.mml.media -d
```
=>
## Start backend

You can now start all services.

```
docker compose up -d 
```

## Create first admin client and user

No default user exists at the beginning. First you have to create one. It can be done with the command line interface inside the [mml.identity](https://github.com/we-kode/mml.identity) project. When the service is running inside docker the call will be:

```
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

```
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-create
```

To list all admin client ids call:

```
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-list
```

And to remove one client call and replace `<client id>` with your client id you want to remove:

```
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-remove <client id>
```