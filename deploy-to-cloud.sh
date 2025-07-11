#!/bin/bash

# Quick Cloud Deployment Script for X-Ray Dashboard

echo "🌐 X-Ray Dashboard - Cloud Deployment Helper"
echo "=============================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit: X-Ray Dashboard ready for cloud deployment"
fi

echo ""
echo "🚀 Choose your deployment platform:"
echo "1. Railway (Recommended - Easiest)"
echo "2. Render (Free tier)"
echo "3. Heroku (Most popular)"
echo "4. Manual setup instructions"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚂 Railway Deployment"
        echo "===================="
        echo "1. First, push your code to GitHub:"
        echo "   - Go to github.com and create a new repository"
        echo "   - Run these commands:"
        echo ""
        echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
        echo "   git branch -M main"
        echo "   git push -u origin main"
        echo ""
        echo "2. Then deploy to Railway:"
        echo "   - Go to https://railway.app"
        echo "   - Sign up with GitHub"
        echo "   - Click 'Deploy from GitHub repo'"
        echo "   - Select your repository"
        echo "   - Railway will automatically deploy!"
        echo ""
        echo "✅ Your dashboard will be live at: https://your-app.up.railway.app"
        ;;
    2)
        echo ""
        echo "🎨 Render Deployment (Free)"
        echo "=========================="
        echo "1. Push to GitHub first (see Railway instructions above)"
        echo ""
        echo "2. Deploy to Render:"
        echo "   - Go to https://render.com"
        echo "   - Sign up with GitHub"
        echo "   - Click 'New Web Service'"
        echo "   - Connect your repository"
        echo "   - Build Command: cd server && npm install"
        echo "   - Start Command: cd server && npm start"
        echo ""
        echo "✅ Your dashboard will be live at: https://your-app.onrender.com"
        ;;
    3)
        echo ""
        echo "🔮 Heroku Deployment"
        echo "==================="
        
        # Check if Heroku CLI is installed
        if ! command -v heroku &> /dev/null; then
            echo "❌ Heroku CLI not found. Please install it first:"
            echo "   Mac: brew install heroku/brew/heroku"
            echo "   Or download from: https://devcenter.heroku.com/articles/heroku-cli"
            exit 1
        fi
        
        echo "✅ Heroku CLI found"
        echo ""
        read -p "Enter your Heroku app name (e.g., my-xray-dashboard): " app_name
        
        if [ -z "$app_name" ]; then
            echo "❌ App name is required"
            exit 1
        fi
        
        echo "🚀 Deploying to Heroku..."
        
        heroku login
        heroku create "$app_name"
        heroku config:set NODE_ENV=production
        heroku config:set NPM_CONFIG_PRODUCTION=true
        
        git push heroku main
        
        echo ""
        echo "✅ Deployment complete!"
        echo "🌐 Your dashboard is live at: https://$app_name.herokuapp.com"
        
        read -p "Would you like to open your app now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            heroku open
        fi
        ;;
    4)
        echo ""
        echo "📖 Manual Setup Instructions"
        echo "============================"
        echo "For detailed step-by-step instructions, see:"
        echo "📄 CLOUD-DEPLOYMENT.md"
        echo ""
        echo "Quick overview:"
        echo "1. Push your code to GitHub"
        echo "2. Choose a platform (Railway recommended)"
        echo "3. Connect your GitHub repository"
        echo "4. Platform automatically deploys!"
        echo "5. Share your live URL with your team"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Next Steps:"
echo "- Your X-Ray Dashboard will be accessible worldwide"
echo "- Multiple users can access it simultaneously"
echo "- Data is automatically saved and shared"
echo "- Updates deploy automatically when you push to GitHub"
echo ""
echo "📧 Share your live URL with your team!"
echo "🔄 To update: git add . && git commit -m 'update' && git push"