# Startup Guide

This Guide Helps with setting up the Mongo DB Server in a way, that allows for Transactions to run, most Functionality is possible without Replica sets, but Functionality like Import of Seed Tests need this.

For setup In WSL environment make sure the option `options = metadata` is present in /etc/wsl.conf.
Creation of the keyfile should be done in a full linux environment the minimal docker platform by DockerDesktop is missing the Tool.

## Mongo DB
* Windows (WSL)
    * **Metadata disconnect:** `sudo echo "[automount]\noptions = metadata,umask=022,fmask=133\n" > /etc/wsl.conf`  
    shutdown wsl `sudo shutdown` , wait Min. 8 second to start WSL again.
* Linux & WSL 
    1. using cd navigate to the project directory
        * **WSL** To reach Windows home, use this command: `cd /mnt/c/Users/$(powershell.exe '$env:UserName' | tr -d '\r')`
    1. create keyfile in the ./mongo-rs/ directory
        * can be any file [6-1024 byte in base64](https://www.mongodb.com/docs/manual/core/security-internal-authentication/#std-label-internal-auth-keyfile)
    1. set the file permissions to owner read only
    1. set owner as userid 999
    <em style=color:gray;> [ReplicaSet Config Local](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/) </em>

    ```bash 
    openssl rand -base64 756 > ./mongo-rs/keyfile
    chmod 400 ./mongo-rs/pki/keyfile
    chown 999:999 ./mongo-rs/pki/keyfile
    ```

    **Deploy:** 
    Start the Docker containers:
    `docker compose up -d`

    Setup the Replicaset & Create the Database 'Seed'
    ``` bash 
    docker exec mongo1 mongosh -u SeedAdmin -p SeedTest --port 27017 --eval 'rs.initiate({_id: \"rs0\", version: 1, members: [{ _id: 0, host: \"mongo1:27017\" }, { _id: 1, host: \"mongo2:27018\" }, { _id: 2, host: \"mongo3:27019\" }]})';
    docker exec mongo1 mongosh -u SeedAdmin -p SeedTest --port 27017 --eval 'db = db.getDB("Seed")';
    ```

    **Connection URL**: `mongodb://SeedAdmin:SeedTest@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.3`

