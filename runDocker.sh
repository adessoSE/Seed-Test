!/bin/bash

rm .env || echo ""

sed -i -e '$a\' ./backend/.env
while read line; do
  export "$line"
  echo "$line"
done < <(cat ./backend/.env)

echo "BACKENDPORT=$PORT" > .env

sed -i -e '$a\' ./frontend/.env
while read line; do
  export "$line"
  echo "$line"
done < <(cat ./frontend/.env)

echo "FRONTENDPORT=$PORT" >> .env

docker-compose down
docker rmi seed-test_backend
docker rmi seed-test_frontend
# docker system prune -a -f
docker-compose up --build