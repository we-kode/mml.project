---
sidebar_position: 1
title: Backend
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

## Steps

Follow the steps in this order. Each step builds on the previous ones and ends with a check.

| Step | What you do | Result |
| --- | --- | --- |
| [1. Prepare the server](./01-prepare-server.md) | Copy the deployment files, set the instance name, create the `mml` user, install Docker | Docker and the network `wekode.mml` are ready |
| [2. Certificates and keys](./02-certificates-and-keys.md) | Choose where TLS is terminated, copy certificates, create secrets and app keys | Certificates, secrets and two app keys |
| [3. Database](./03-database.md) | Configure and start PostgreSQL with the databases of Identity and Media | `wekode.mml.db` is running |
| [4. Cache and message bus](./04-cache-and-message-bus.md) | Configure and start Redis and RabbitMQ | `wekode.mml.cache` and `wekode.mml.mbus` are running |
| [5. Reverse proxy](./05-reverse-proxy.md) | Configure and start Nginx | `wekode.mml.reverseproxy` is running |
| [6. Identity](./06-identity.md) | Configure and start the Identity service | The openid configuration is reachable |
| [7. Media](./07-media.md) | Configure and start the Media service | `wekode.mml.media` is running |
| [8. Start and first admin](./08-start-and-first-admin.md) | Start everything and create the first admin | You can log in with the [administration app](../administration-app.mdx) |

Topics for running systems, like upgrading PostgreSQL, an external TLS proxy or moving to another domain, are described in [Operations](./operations.md).

## Folder layout

All files and folders are placed in `~/medialib`. After all steps the folder looks like this:

```text
~/medialib
├── .env
├── docker-compose.yml
├── certs/            # step 2, only with TLS at the reverse proxy or the services
├── db/               # step 3
├── cache/            # step 4
├── mbus/             # step 4
├── proxy/            # step 5
├── identity/         # steps 2 and 6
└── media/            # step 7
```
