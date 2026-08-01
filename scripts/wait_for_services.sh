#!/usr/bin/env bash
set -e

echo "Waiting for PostgreSQL service..."
until nc -z -v -w30 postgres 5432; do
  echo "PostgreSQL is unavailable - sleeping..."
  sleep 2
done

echo "Waiting for Redis service..."
until nc -z -v -w30 redis 6379; do
  echo "Redis is unavailable - sleeping..."
  sleep 2
done

echo "All background services are online!"
