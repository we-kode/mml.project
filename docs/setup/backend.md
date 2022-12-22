---
sidebar_position: 1
---

# Backend

You can install the backend on a server you like. Its your choice. You can use kubernetes, .net install or docker-compose as you like.
In this documentation we will focus only on the setup of the backend with docker-compose on a ubuntu 22.05 LTS
Here we will for you a step by setp guide you can use to setup manual the server
Feel free to automate the process. However we do not provide a setup script.

The backend consist of multple services which need to be setup seperate. We provide one mono docker-compose file and a default .env-configuration file
In the .env ifle defaults are define. Feel free to change the configuration on your neeeds.

:::info
We setzen vorraus, dass you wissen wie man linux und docker.compose bedient. Wenn nicht gucke erst auf official docu of dockerc-compose
:::

## Create folder (optional)

```
mkdir ~/medialib
cd ~/medialib
```

scp docker-compose.yml .env ~/medialib

configure folder rights as you like

## Create mml user

```
sudo groupadd -r -g 1001 mml && sudo useradd -r -d /nonexistent -s /bin/false -u 1001 -g 1001 mml
```

## Install docker

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

Its your problem

## Domain and SSL/TLS certificates

We need domain and certs in .pfx, key, crt files it`s your problem

copy them e.g to ~/medialib/certs

## Configure database service

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
sudo chmod -R 0550 db/
sudo docker compose up wekode.mml.db -d
```

## Configure cache service

```
mkdir cache
scp default.redis.conf ~/medialib/cache/redis.conf
# change password in redis.conf
# enter values in .env in redis section
sudo chown -R 999:999 cache/
sudo chmod -R 0550 cache/
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
sudo chmod -R 0550 mbus/
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
sudo chmod -R 0550 proxy/
sudo docker compose up wekode.mml.reverseproxy -d
```

## Configure identity service

docker-hub reference

```
scp Identity.API/default.appsettings.json ~/medialib/identity/appsettings.json
# enter values in appsettings
# enter values in .env
sudo chown -R 1001:1001 identity/
sudo chmod -R 0550 identity/
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
sudo chmod -R 0550 media/
sudo chown -R 1001:1001 /mnt/media/records
sudo chmod -R 0750 /mnt/media/records
sudo docker compose up wekode.mml.media -d
```

## Start backend

```
cd ~/medialib
docker compose up -d 
```

## Create first admin client and user

```
sudo docker exec -it wekode.mml.identity /bin/bash
create
```

You will be ask for a username and a password. The password must be at least 12 characters long. If no admin app exists already, a new one will be created and the clientId will be printed on the console.

### Manage admin clients

You can install the admin app on several computers for example if you have multiple admins. The admin users can be managed in your admin app.
If you want to give them a different client id you can generate a new one by using the cli inside the mml.identity project.

Admin clients can be created, listed and removed by the command line e.g in the container. To create one client call

```
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-create
```

To list all admin clients call:

```
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-list
```

And to remove one client call:

```
docker exec -it wekode.mml.identity /bin/bash
root@6712536aabd:/app# admin-remove <client id>
```