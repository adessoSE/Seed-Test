#!/bin/bash

del .env
@echo off
for /f "tokens=*" %%s in (./backend/.env) do (
  set %%s
)

echo BACKENDPORT=%PORT%>.env

@echo off
for /f "tokens=*" %%s in (./frontend/.env) do (
  set %%s
)

echo FRONTENDPORT=%PORT%>>.env

docker compose down
docker rmi seed-test_backend
docker rmi seed-test_frontend
echo Y | docker system prune -a
docker-compose up --build
