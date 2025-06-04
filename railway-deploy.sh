#!/bin/bash
# Railway deployment script

echo "🚀 Starting Railway deployment..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Apply database migrations
echo "🗄️ Applying database migrations..."
npx prisma migrate deploy

# Initialize database with seed data
echo "🌱 Initializing database..."
npm run db:init

# Apply full-text search indices (CRITICAL OPTIMIZATION)
echo "🔍 Applying full-text search indices..."
npm run db:indices

# Start the server
echo "🎯 Starting server..."
npm start
