---
sidebar_position: 2
title: "Step 1: Prepare the server"
---

# Step 1: Prepare the server

:::note You need
A server with Ubuntu and a user with `sudo` rights.
:::

## Copy monodeploy files

In this documentation all files and folders will be placed in `~/medialib`. Create this folder first.

```bash
mkdir ~/medialib
cd ~/medialib
```

Copy [`docker-compose.yml`](https://github.com/we-kode/mml.deployment/blob/develop/docker-compose.yml) and the [`.env`](https://github.com/we-kode/mml.deployment/blob/develop/.env) from the repository to `~/medialib` on server.

### Instance name

Set a name for your instance in the `.env` file. The name identifies the owner of [records](../../concepts/records.mdx) and your instance for [partner instances](../../concepts/federation.mdx). It may contain letters, digits, `.`, `_` and `-` with up to 64 characters and must not be changed later. The media service does not start with an invalid name.

The Media service stores the name at the first start and refuses to start, if `INSTANCE` differs from it later, since the owner of records, the registrations of partners and the access tokens depend on the name. The names are compared case sensitive. Identity and Media must use the same name.

:::caution Rename an instance on purpose
Only rename an instance if you accept to register all partners again. Stop the services and replace `old-name` and `new-name` in the Media database:

```sql
UPDATE settings SET value = 'new-name' WHERE key = 'InstanceName';
UPDATE records SET owner_instance = 'new-name' WHERE owner_instance = 'old-name';
```

Then set `INSTANCE=new-name` in the `.env` file and start the services. Admins and clients have to log in again, since the access tokens contain the name. Partners still know the instance by its old name: remove the registration of the instance at every partner and register it again with a new invitation. Entries of the audit log keep the old name.
:::

```bash
## The system tenant name to be used e.g in federation. The INSTANCE value should not contain spaces.
INSTANCE=my-media-lib
```

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

## Check

```bash
id mml
sudo docker network ls | grep wekode.mml
ls ~/medialib
```

The user `mml` with id `1001` exists, the network `wekode.mml` is listed and `~/medialib` contains `docker-compose.yml` and `.env` with your `INSTANCE`.

**Next:** [Step 2: Certificates and keys](./02-certificates-and-keys.md)
