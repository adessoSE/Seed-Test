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

    **Deploy:** 
    `docker compose up -d`
    ``` bash 
    docker exec mongo1 mongosh -u SeedAdmin -p SeedTest --port 27017 --eval 'rs.initiate({_id: \"rs0\", version: 1, members: [{ _id: 0, host: \"mongo1:27017\" }, { _id: 1, host: \"mongo2:27018\" }, { _id: 2, host: \"mongo3:27019\" }]})
    ```
    This command initiates the Replica-Set.


