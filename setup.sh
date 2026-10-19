#!/bin/sh
# One-time setup: pull the base image and create the external volumes.
set -e

echo ">> Pulling the alpine base image"
docker pull alpine:3.20

echo ">> Creating external volumes (skipped if they already exist)"
docker volume inspect notes-db-data >/dev/null 2>&1 || docker volume create notes-db-data
docker volume inspect notes-uploads >/dev/null 2>&1 || docker volume create notes-uploads

echo ">> Building images and starting containers"
docker compose up -d --build

echo ">> Done. Open http://localhost:8080"
