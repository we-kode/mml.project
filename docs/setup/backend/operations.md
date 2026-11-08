---
sidebar_position: 10
title: Operations
---

# Operations

Topics for a running backend, which are not needed for the first setup.

## SSL termination at an external proxy

If several services share one domain or server, an external proxy like [Nginx Proxy Manager](https://nginxproxymanager.com/), Traefik or Caddy can terminate TLS and forward the requests over http to the reverse proxy of MML.

1. Set `PROXY_TLS=false` in the `.env` file. `CERT_NAME` is not needed.
2. Configure Identity and Media without `TLS:Cert` and set `IDENTITY_API_ADDRESS=http://wekode.mml.identity` and `MEDIA_API_ADDRESS=http://wekode.mml.media`.
3. Keep `OpenId:Issuer` of both services at the public https url of the external proxy, e.g. `https://mml.example.com/`.
4. Forward the domain in the external proxy to `http://<host of mml>:<SSL_PORT>` and enable websockets, which are used by `/hub/client` and `/hub/federation`. In Nginx Proxy Manager enable **Websockets Support** of the proxy host.
5. Raise the upload limit of the external proxy to at least `FILE_UPLOAD_LIMIT`, otherwise uploads and [federation](../../concepts/federation.mdx) transfers fail.

The external proxy has to send the headers `X-Forwarded-For` and `X-Forwarded-Proto`. Nginx Proxy Manager, Traefik and Caddy send them by default. The reverse proxy of MML takes the client ip from `X-Forwarded-For`, so the rate limit and the logs refer to the real client. It trusts this header only from the networks in `TRUSTED_PROXY`, by default all private networks. Set `TRUSTED_PROXY` to the ip of your external proxy, e.g. `TRUSTED_PROXY=192.168.10.5/32`, so no other device in your network can fake its ip. Add the address of your external proxy as well, if it reaches MML from a public or IPv6 address.

:::caution Security
With `PROXY_TLS=false` the reverse proxy trusts the `X-Forwarded-Proto` header. Allow only your external proxy to reach `SSL_PORT`, e.g. with a firewall rule.
:::

## Move to another domain

A running system can move to another domain, e.g. from a free DynDNS domain to an own domain behind an external proxy, without registering the devices again. During the move both domains work in parallel:

- New devices register at the new domain.
- Devices with a current app learn the new domain on their next start at the old domain, check in the background that they are registered at the new domain and then switch to it. If the check fails, e.g. because the new domain is not reachable yet, the device keeps the old domain and tries again on the next start. A device is never unregistered by the move.
- Devices with an older app keep using the old domain.

1. Set up the new domain at the external proxy as described in [SSL termination at an external proxy](#ssl-termination-at-an-external-proxy), but forward it to `http://<host of mml>:<HTTP_PORT>`.
2. Set `PROXY_TLS=both` in the `.env` file. The reverse proxy then accepts the old domain with TLS on `SSL_PORT` and the requests of the external proxy over http on `HTTP_PORT`. Bind `HTTP_PORT` to an address only the external proxy can reach, e.g. `HTTP_PORT=192.168.10.2:5080`, and set `TRUSTED_PROXY` to the ip of the external proxy.
3. Set `OpenId:Issuer` of Identity **and** Media to the new domain, e.g. `https://mml.example.com/`, and restart both services together. The tokens are then independent of the old domain. The apps request a new token automatically once, admins have to log in again and [federation](../../concepts/federation.mdx) partners are informed about the new address. Media has to reach the new domain from the docker network.
4. Set `Connection:ServerName` in the appsettings of Identity to the new domain in the format `host[:port]` without the default port 443, e.g. `mml.example.com`, and restart Identity. From now on the admin app creates registration and connection settings QR codes with the new domain and the apps start to move.
5. Wait until the devices moved. Each device with a current app moves on its next start, devices with an older app move after the app was updated and started.
6. Switch off the old domain, e.g. remove the port forwarding of `SSL_PORT` in your router. `PROXY_TLS=both` can stay, so the devices at the new domain do not notice anything. If you switch to `PROXY_TLS=false` later, forward the external proxy to `SSL_PORT` at the same time. Devices, which did not move until then, can not reach the server anymore. Scan the connection settings QR code of the admin app in the settings of the app under **Update connection settings** to move them without registering again.

```json
"Connection": {
    "ServerName": "mml.example.com"
  },
```

Shared links contain the domain they were created with and stop working, when the old domain is switched off.

:::caution Security
With `PROXY_TLS=both` the reverse proxy trusts the `X-Forwarded-Proto` header of requests on `HTTP_PORT` and the `X-Forwarded-For` header of the networks in `TRUSTED_PROXY` on both ports. Allow only your external proxy to reach `HTTP_PORT` and set `TRUSTED_PROXY` to its ip.
:::

### Example

An instance runs at the DynDNS domain `mymml.dynv6.net` on port `5050`. The router forwards port `5050` to the MML server `192.168.10.2`, and the reverse proxy of MML terminates TLS. The instance moves to `mml.example.com`, which Nginx Proxy Manager on `192.168.10.5` serves on port 443 with its own certificate.

| | Before | During the move | After the move |
| --- | --- | --- | --- |
| Old domain | `https://mymml.dynv6.net:5050` | works | switched off |
| New domain | – | `https://mml.example.com` | works |
| `PROXY_TLS` | `true` | `both` | `both` |
| Apps store | `mymml.dynv6.net:5050` | old or new domain | `mml.example.com` |

**1. Nginx Proxy Manager:** Add a proxy host for `mml.example.com` with the scheme `http`, the forward host `192.168.10.2` and the forward port `80`. Enable **Websockets Support** and request a certificate in the tab **SSL**. Raise the upload limit in the tab **Advanced**, e.g. `client_max_body_size 100m;`.

**2. Reverse proxy of MML:** Keep the old values and add the new ones in `~/medialib/.env`. Port `80` of the MML server is bound to its LAN address, so only devices in the LAN reach it.

```bash
CERT_NAME=mymml.dynv6.net
PROXY_TLS=both
TRUSTED_PROXY=192.168.10.5/32
SSL_PORT=5050
HTTP_PORT=192.168.10.2:80
```

```bash
sudo docker compose up -d wekode.mml.reverseproxy
```

Check that `https://mml.example.com/.well-known/openid-configuration` and `https://mymml.dynv6.net:5050/.well-known/openid-configuration` both answer. The issuer in the answer is still the old domain.

**3. Issuer:** Set the issuer in `~/medialib/identity/appsettings.json` and `~/medialib/media/appsettings.json` and restart both services together.

```json
"OpenId": {
    "Issuer": "https://mml.example.com/"
  },
```

```bash
sudo docker compose restart wekode.mml.identity wekode.mml.media
```

Both addresses from step 2 now answer with the issuer `https://mml.example.com/`. Log in to the admin app again, preferably at `mml.example.com`.

**4. Announce the new domain:** Add the server name to `~/medialib/identity/appsettings.json` without a port, because Nginx Proxy Manager uses the default port 443. Port `80` between Nginx Proxy Manager and MML is never part of the server name.

```json
"Connection": {
    "ServerName": "mml.example.com"
  },
```

```bash
sudo docker compose restart wekode.mml.identity
```

Each device with a current app moves to `mml.example.com` on its next start. New registration QR codes contain `mml.example.com`, also if the admin app is logged in at the old domain.

**5. Wait:** Give the devices time to start the app at least once, e.g. some weeks. Ask the users of older apps to update the app before the old domain is switched off.

**6. Switch off the old domain:** Remove the port forwarding of `5050` in the router. Nothing else changes, devices at `mml.example.com` do not notice anything. Move devices, which still use the old domain, by scanning the connection settings QR code of the admin app under **Update connection settings** in the app.

## Upgrading postgres version

It is recommended to use a fixed version of the postgres docker image and not the latest tag. When you want to upgrade to newer version of postgres follow the following steps:

### Stop all running services

```bash
docker compose down
```

### Create dumps of all databases you want to backup

```bash
docker compose up wekode.mml.db -d
docker exec -it wekode.mml.db pg_dump <database> -U <superuser> > <database>.sql
```

### Stop Database service

```bash
docker compose down wekode.mml.db
```

### Backup the db data directory

```bash
mv <db-folder-on-host>/ db-old/
mkdir <db-folder-on-host>
```
### Prepare the new version

Increment the version of postgres in the env file and start the container.

```bash
docker compose up -d wekode.mml.db
```

### Import the db dumps

```bash
docker exec -i wekode.mml.db psql -U <superuser|dbuser> -d <database> -f <database>.sql
```

### Clean up

```bash
rm -rf db-old
rm <database>.sql
docker compose up -d
```

## Export records to csv

Run `\copy (Select record_id, title, date, track_number, duration, a.album_name as album, ar.name as artist, g.name as genre FROM records r JOIN albums a ON a.album_id = r.album_id JOIN artists ar ON ar.artist_id = r.artist_id JOIN genres g ON g.genre_id = r.genre_id) TO '/data/records.csv' WITH DELIMITER ',' CSV HEADER;` 
as media database user inside the db container to export the list of records and the metadata to csv to use it for reoporting or other tools.
