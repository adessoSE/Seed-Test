@echo off

docker build -t seed-test-backend:latest^
 --build-arg IMAGE_NAME=seed-test-backend^
 --build-arg IMAGE_TAG=latest^
 ../../backend --no-cache

docker build -t seed-test-frontend:latest^
 --build-arg IMAGE_NAME=seed-test-frontend^
 --build-arg IMAGE_TAG=latest^
 ../../frontend --no-cache

docker tag seed-test-backend:latest i3rotlher/seed-test-backend:latest
docker tag seed-test-frontend:latest i3rotlher/seed-test-frontend:latest

docker login

docker push i3rotlher/seed-test-backend:latest
docker push i3rotlher/seed-test-frontend:latest
