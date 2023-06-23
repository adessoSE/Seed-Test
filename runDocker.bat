del .env
@echo off
for /f "tokens=*" %%s in (./backend/.env) do (
  set %%s
)
IF "%PORT%"=="" (
  SET "PORT=8080"
)
echo BACKENDPORT=%PORT%>.env

SET "PORT="
@echo off
for /f "tokens=*" %%s in (./frontend/.env) do (
  set %%s
)
IF "%PORT%"=="" (
  SET "PORT=4200"
)
echo FRONTENDPORT=%PORT%>>.env

docker compose down
docker rmi seed-test-backend
docker rmi seed-test-frontend
docker compose build --no-cache
docker compose up -d