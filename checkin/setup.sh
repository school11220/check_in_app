#!/bin/bash

# Setup script for Event Ticketing System

echo "🎫 Setting up Event Ticketing System..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your credentials."
    echo ""
    echo "Required credentials:"
    echo "1. PostgreSQL DATABASE_URL"
    echo "2. Stripe API keys (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)"
    echo "3. Stripe webhook secret (STRIPE_WEBHOOK_SECRET)"
    echo "4. Generate a random TICKET_SECRET_KEY (32+ characters)"
    echo ""
    echo "Please update .env and run this script again."
    exit 1
fi

echo "✅ Found .env file"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Push database schema
echo "🗃️  Pushing database schema..."
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server, run:"
echo "   npm run dev"
echo ""
echo "📖 Don't forget to set up Stripe webhooks:"
echo "   stripe listen --forward-to localhost:3000/api/webhooks/stripe"
echo ""
