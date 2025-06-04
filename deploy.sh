#!/bin/bash
# Railway deploy script

echo "🔄 Building application..."
npm run build

echo "🗃️ Generating Prisma client..."
npm run prisma:generate

echo "🚀 Running database migrations..."
npm run prisma:migrate:deploy

echo "✅ Deploy completed successfully!"