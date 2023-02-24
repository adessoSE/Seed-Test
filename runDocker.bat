#!/bin/bash

del .env
@echo off
for /f "tokens=*" %%s in (./backend/.env) do (
  set %%s
)

set "PORT=%PORT:8080%"
echo BACKENDPORT=%PORT%>.env

@echo off
for /f "tokens=*" %%s in (./frontend/.env) do (
  set %%s
)

set "PORT=%PORT:4200%"
echo FRONTENDPORT=%PORT%>>.env

docker compose down
docker rmi seed-test-backend
docker rmi seed-test-frontend
docker compose up -d --build