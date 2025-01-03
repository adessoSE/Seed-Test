# Startup Guide

## Mongo DB
* Windows (WSL)
    * **Metadata disconnect:** `sudo echo "[automount]\noptions = metadata,umask=022,fmask=133\n" > /etc/wsl.conf` restart wait min 8 second to start aggain
* Linux & WSL 
    ```bash 
    openssl rand -base64 756 > <path-to-keyfile>
    chmod 400 <path-to-keyfile>
    ```
    <em style=color:gray;> [ReplicaSet Config Local](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/) </em>

    **Deploy:** docker compose up -d  b 


