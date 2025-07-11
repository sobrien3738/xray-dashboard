#!/bin/bash

# X-Ray Dashboard Initial Setup Script

set -e

echo "🔧 X-Ray Dashboard Setup"
echo "========================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Set up environment file
echo "⚙️ Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Environment file created"
else
    echo "⚠️ Environment file already exists"
fi

# Run database migration
echo "🗄️ Setting up database..."
npm run migrate

# Ask about sample data
read -p "🌱 Would you like to add sample data for testing? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run seed
    echo "✅ Sample data added"
fi

cd ..

# Create data directories
echo "📁 Creating data directories..."
mkdir -p server/data server/uploads

# Create gitkeep files
touch server/uploads/.gitkeep
touch uploads/.gitkeep

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 Quick Start Commands:"
echo "   Development server: cd server && npm run dev"
echo "   Production build:   ./deploy.sh"
echo "   Docker deployment:  docker-compose up -d"
echo ""
echo "🌐 Once started, access the dashboard at:"
echo "   http://localhost:3001"
echo ""
echo "📋 Next Steps:"
echo "   1. Review server/.env configuration"
echo "   2. Start the development server"
echo "   3. Import your Excel data"
echo "   4. Deploy to production when ready"