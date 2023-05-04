del .env
@echo off
for /f "tokens=*" %%s in (./backend/.env) do (
  set %%s
)

set "PORT=%PORT%"
IF "%PORT%"=="" (
  SET "PORT=8080"
) ELSE (
  SET "PORT=%PORT%"
)
echo BACKENDPORT=%PORT%>.env

@echo off
for /f "tokens=*" %%s in (./frontend/.env) do (
  set %%s
)

set "PORT=%PORT%"
IF "%PORT%"=="" (
  SET "PORT=8080"
) ELSE (
  SET "PORT=%PORT%"
)
echo FRONTENDPORT=%PORT%>>.env

docker compose down
docker rmi seed-test-backend
docker rmi seed-test-frontend
docker compose build --no-cache
docker compose up -d