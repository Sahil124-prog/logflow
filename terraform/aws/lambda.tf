resource "aws_iam_role" "lambda_role" {
  name = "logflow-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_s3_policy" {
  name = "logflow-lambda-s3-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = "${aws_s3_bucket.critical_logs.arn}/*"
    },
    {
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda"
  output_path = "${path.module}/../../lambda/function.zip"
}

resource "aws_lambda_function" "critical_log_archiver" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "logflow-critical-log-archiver"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      S3_BUCKET  = aws_s3_bucket.critical_logs.bucket
    }
  }

  tags = {
    Project = "LogFlow"
  }
}

output "lambda_function_name" {
  value = aws_lambda_function.critical_log_archiver.function_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.critical_logs.bucket
}