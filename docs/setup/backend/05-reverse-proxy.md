---
sidebar_position: 6
title: "Step 5: Reverse proxy"
---

# Step 5: Reverse proxy

:::note You need
[Step 2](./02-certificates-and-keys.md) with the certificates of your variant.
:::

[Nginx](https://www.nginx.com/) is used as reverse proxy and api gateway. This is the entrypoint to the backend from extern requests of the admin and mobile app.

It forwards the openid configuration, the api and the hub `/hub/client` of the Identity service to Identity and all other requests to the Media service. These include the public pages under `/media/s/`, which open [shared links](../../concepts/sharing.mdx) in the browser. Responses of the Media service are not buffered, so large ZIP archives are streamed.

## Create folder
Create the folder where the configuration will be.

```bash
mkdir -p proxy/logs
```

## Configuration

Copy [`default.conf.template`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/default.conf.template) and [`15-mml-listen.sh`](https://github.com/we-kode/mml.deployment/blob/develop/reverse-proxy/15-mml-listen.sh) to `~/medialib/proxy` on the server and make the script executable. The script generates the listen configuration depending on `PROXY_TLS` when the proxy starts.

```bash
chmod +x proxy/15-mml-listen.sh
```

## Update .env file and start service

Update the required values in the `~/medialib/.env` file.

```bash {13,17}
cat .env

## proxy configuration section
## The docker tag to be used.
# NGINX_VERSION=latest
## true: the proxy terminates TLS with the certificate CERT_NAME.
## false: the proxy listens on http behind an external proxy, which terminates TLS. Never expose it directly to the internet.
## both: TLS on SSL_PORT for direct clients and http on HTTP_PORT for an external proxy at the same time, e.g. while moving to another domain.
# PROXY_TLS=true
## Only used with PROXY_TLS=false or both. Space separated ips or CIDRs of the external proxies, which are trusted to send the client ip
## in X-Forwarded-For. Replaces the default private networks "10.0.0.0/8 172.16.0.0/12 192.168.0.0/16". e.g. 192.168.10.5/32
# TRUSTED_PROXY=
## The port on the host machine for requests to the mml-app from extern (https, or http when PROXY_TLS=false). Recomended to be changed to another port.
SSL_PORT=5555
## The port the reverse proxy is listen on in the docker file.
#INTERN_SSL_PORT=5050
## Only used with PROXY_TLS=both. The http port on the host machine for the external proxy, e.g. 192.168.10.2:5080.
## Bind it to an address only the external proxy can reach. By default a random port is bound to 127.0.0.1.
# HTTP_PORT=127.0.0.1:
## Only used with PROXY_TLS=both. The http port the reverse proxy listens on in the docker file. Must differ from INTERN_SSL_PORT.
# INTERN_HTTP_PORT=5080
## Path to the folder where the default.conf.template and the executable 15-mml-listen.sh files are stored on host.
CONF_TEMPLATE=/home/media/medialib/proxy
## Optional. Path to the folder on host where the access.log and error.log of the proxy are written. Must be writable by the proxy.
## Share links are not logged. Rotate the logs on the host, e.g. with logrotate.
PROXY_LOGS=/home/media/medialib/proxy/logs
## Upload file limit to prevent huge files to be uplaoded to server.
## Must be larger than Federation:ChunkSizeMb of every partner instance (default 32 MB), which sends records to this instance.
#FILE_UPLOAD_LIMIT=100m
...
```

Set user rights of the folder to the [docker user](./01-prepare-server.md#create-mml-user) and start the service.

```bash
sudo chown -R 1001:1001 proxy/
sudo docker compose up wekode.mml.reverseproxy -d
```

## Logs

The reverse proxy writes its logs to `access.log` and `error.log` in `PROXY_LOGS` instead of the console. Requests of [shared links](../../concepts/sharing.mdx) are not logged, because their tokens are part of the path. `docker logs wekode.mml.reverseproxy` only shows the start of the container and errors of the configuration.

nginx does not rotate the files. Rotate them on the host, e.g. with logrotate in `/etc/logrotate.d/mml-proxy`:

```bash
/home/media/medialib/proxy/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        docker exec wekode.mml.reverseproxy nginx -s reopen
    endscript
}
```

## Check

```bash
sudo docker compose ps wekode.mml.reverseproxy
sudo docker logs wekode.mml.reverseproxy
```

The container is running and its log shows no configuration errors. Requests answer with an error until Identity and Media are started.

**Next:** [Step 6: Identity](./06-identity.md)
