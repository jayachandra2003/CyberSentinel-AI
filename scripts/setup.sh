#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🛡️ CyberSentinel AI Environment Setup"
echo "=========================================="

if [ ! -f .env ]; then
  echo "📄 Copying root .env.example -> .env"
  cp .env.example .env
fi

if [ ! -f frontend/.env.local ]; then
  echo "📄 Copying frontend/.env.example -> frontend/.env.local"
  cp frontend/.env.example frontend/.env.local
fi

if [ ! -f backend/.env ]; then
  echo "📄 Copying backend/.env.example -> backend/.env"
  cp backend/.env.example backend/.env
fi

echo "📦 Installing Frontend Dependencies..."
cd frontend && npm install && cd ..

echo "🐍 Setting up Python Virtual Environment..."
cd backend
if [ ! -d "venv" ]; then
  python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "✅ CyberSentinel AI Environment Setup Complete!"
