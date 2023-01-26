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
docker rmi seed-test-backend
docker rmi seed-test-frontend
@REM docker-compose up --build
