#!/bin/bash

set -e

echo "=== Building Lambda ==="
npm install
npm run build

echo "=== Packaging Lambda ==="
cd dist
zip -r lambda.zip .
cd ..

echo "=== Deploying with Terraform ==="
cd infra/stack
terraform init
terraform apply -auto-approve

echo ""
echo "=== Deployment Complete ==="
echo ""
terraform output api_gateway_url
terraform output echo_endpoint
