#!/bin/sh

echo "Waiting for LocalStack..."
until curl -s http://localstack:4566/_localstack/health | grep -q '"s3": "available"'; do
  sleep 2
done

echo "LocalStack ready. Creating S3 bucket..."
aws --endpoint-url=http://localstack:4566 s3 mb s3://logflow-critical-logs-local

echo "Installing zip..."
yum install -y zip -q

echo "Zipping Lambda..."
cd /lambda
zip -r /tmp/function.zip .

echo "Deploying Lambda to LocalStack..."
aws --endpoint-url=http://localstack:4566 lambda create-function \
  --function-name logflow-critical-log-archiver \
  --runtime nodejs18.x \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --handler index.handler \
  --zip-file fileb:///tmp/function.zip \
  --environment Variables="{S3_BUCKET=logflow-critical-logs-local}"

echo "Done! LocalStack S3 + Lambda ready."