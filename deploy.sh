#!/bin/bash

# X-Ray Dashboard Deployment Script

set -e

echo "🚀 X-Ray Dashboard Deployment Script"
echo "======================================"

# Configuration
ENVIRONMENT=${1:-development}
SERVICE_NAME="xray-dashboard"

echo "Environment: $ENVIRONMENT"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating data directories..."
mkdir -p data uploads

# Set up environment file
if [ ! -f "server/.env" ]; then
    echo "⚙️ Setting up environment configuration..."
    cp server/.env.example server/.env
    echo "✅ Environment file created. Please review server/.env before proceeding."
fi

# Build and start services
echo "🔨 Building Docker images..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose --profile production build
    echo "🚀 Starting production services..."
    docker-compose --profile production up -d
else
    docker-compose build
    echo "🚀 Starting development services..."
    docker-compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Service is healthy!"
else
    echo "❌ Service health check failed. Checking logs..."
    docker-compose logs $SERVICE_NAME
    exit 1
fi

# Run database migration
echo "🗄️ Running database migration..."
docker-compose exec $SERVICE_NAME node server/scripts/migrate.js

# Optional: Seed with sample data
read -p "🌱 Would you like to seed the database with sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose exec $SERVICE_NAME node server/scripts/seed.js
fi

# Display access information
echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Access URLs:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "   Main URL: http://localhost (via Nginx)"
    echo "   Direct API: http://localhost:3001"
else
    echo "   Main URL: http://localhost:3001"
fi
echo "   Health Check: http://localhost:3001/api/health"
echo ""
echo "📊 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Database backup: docker-compose exec $SERVICE_NAME node server/scripts/backup.js"
echo ""
echo "📁 Data persistence:"
echo "   Database: ./data/"
echo "   Uploads: ./uploads/"