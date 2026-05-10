terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style = true

  endpoints {
    s3  = "http://127.0.0.1:4566"
    iam = "http://127.0.0.1:4566"
  }
}

resource "aws_s3_bucket" "log_archives" {
  bucket = "logflow-log-archives"

  tags = {
    Name        = "LogFlow Log Archives"
    Environment = "development"
    Project     = "logflow"
  }
}

resource "aws_iam_policy" "logflow_s3_policy" {
  name        = "logflow-s3-policy"
  description = "Allow LogFlow API to write logs to S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::logflow-log-archives/*"
      }
    ]
  })
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.log_archives.bucket
  description = "The name of the S3 bucket for log exports"
}

output "iam_policy_arn" {
  value       = aws_iam_policy.logflow_s3_policy.arn
  description = "The ARN of the IAM policy for LogFlow S3 access"
}

