#!/bin/bash

rm .env || echo ""

sed -i -e '$a\' ./backend/.env
while read line; do
  export "$line"
done < <(cat ./backend/.env)

PORT="${PORT:-8080}"

echo "BACKENDPORT=$PORT" > .env

sed -i -e '$a\' ./frontend/.env
while read line; do
  export "$line"
done < <(cat ./frontend/.env)

PORT="${PORT:-4200}"

echo "FRONTENDPORT=$PORT" >> .env

docker compose down
docker rmi seed-test_backend
docker rmi seed-test_frontend
docker compose up --build