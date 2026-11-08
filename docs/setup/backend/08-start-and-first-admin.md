---
sidebar_position: 9
title: "Step 8: Start and first admin"
---

# Step 8: Start and first admin

:::note You need
Steps [1](./01-prepare-server.md) to [7](./07-media.md).
:::

## Start backend

You can now start all services.

```bash
docker compose up -d 
```

### Third-party licenses

The images of the Identity and Media services contain the licenses of all used NuGet packages in `/app/licenses`: `THIRD-PARTY-NOTICES.md` lists the packages and `texts/` contains the license texts. They are generated with [nuget-license](https://github.com/sensslen/nuget-license) when the image is built and are not served by any endpoint. Licenses of system packages of the image, e.g. ffmpeg in the Media image, are stored in `/usr/share/doc`.

```bash
docker exec -it wekode.mml.media ls /app/licenses
```

### Automatic cleanup

The Media service removes cover files no longer used by any [record](../../concepts/records.mdx) on startup and then once a day, and deletes expired [announcements](../../concepts/announcements.mdx) every hour.

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

You can install the admin app on several computers for example if you have multiple [admins](../../concepts/admins.mdx). The [admin users](../../concepts/admins.mdx) can be managed in your admin app.
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

## Check

Install the [administration app](../administration-app.mdx) and log in with the admin user, the client id printed by `create` and the admin app key of [step 2](./02-certificates-and-keys.md#app-keys).
