# Startup Guide

This Guide Helps with setting up the Mongo DB Server in a way, that allows for Transactions to run, most Functionality is possible without Replica sets, but Functionality like Import of Seed Tests need this Setup.

Creation of the keyfile should be done in a full Linux environment (Ubuntu/Debian) the minimal docker platform by DockerDesktop is missing the required Tools.

## Mongo DB
Windows (WSL)
* When running Repilca sets in a WSL environment it is nesicary to disconnect the Metadata, File permissions are generally Shared between Windows & WSL and it would not be possible to set the by Mongo required Permissions correctly. 
* **Metadata disconnect:** `sudo echo "[automount]\noptions = metadata,umask=022,fmask=133\n" > /etc/wsl.conf`
* **Alternative:** `sudo nano /etc/wsl.conf` add a new line with `[automount]` in the nextline set `options = metadata,umask=022,fmask=133` save with STRG/O, exit with STRG/X
* Wsl Needs to restart for the changes to take effect in the WSL console enter `sudo shutdown` and execute, it will schedule a shutdown in one minute. After shutdown, wait minimum 8 second to start WSL again. **Make sure to Save and Stop all Docker Containers before executing the command**

### KeyFile

Mongo does require a keyfile to establish secure comunication between the nodes os the Replica Set. This Step is Manditory to create a working replicaSet.

1. use `cd` to navigate to the project directory
    * **WSL** To reach Windows home, use this command: `cd /mnt/c/Users/$(powershell.exe '$env:UserName' | tr -d '\r')`
1. create keyfile in the ./mongo-rs/ directory
    * can be any file [6-1024 byte in base64](https://www.mongodb.com/docs/manual/core/security-internal-authentication/#std-label-internal-auth-keyfile)
    * To create a Secure Keyfile use `openssl rand -base64 756 > ./mongo-rs/rs_keyfile`. The command creates a cyrpto graphicaly save and unique Key encoded in a human readable form.
1. set the file permissions to owner read only `chmod 400 ./mongo-rs/rs_keyfile`. This is for Security purposes, and any party other than the service from reading the file.
1. set owner as userid 999 `sudo chown 999:999 ./mongo-rs/rs_keyfile` This sets the ownership of the file to the Service user. __Be aware, this will also prevent file delete, even in Windows file system with Admin Priviledge, to delete this file use `sudo rm ./mongo-rs/rs_keyfile`__

<em style=color:gray;> [ReplicaSet Config Local](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/) </em>


### Deploy:
Start the Docker containers:
`docker compose up -d mongo1 mongo2 mongo3`

Setup the Replicaset with the first comand here, the second should confirm that a Replica Set has been established.
``` bash 
docker exec mongo1 mongosh -u SeedAdmin -p SeedTest --port 27017 --eval 'rs.initiate({_id: \"rs0\", version: 1, members: [{ _id: 0, host: \"mongo1:27017\" }, { _id: 1, host: \"mongo2:27018\" }, { _id: 2, host: \"mongo3:27019\" }]})';

docker exec mongo1 mongosh -u SeedAdmin -p SeedTest --port 27017 --eval 'rs.status()';
```

**Connection URL**: `mongodb://SeedAdmin:SeedTest@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.3`

