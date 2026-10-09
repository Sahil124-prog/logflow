resource "aws_s3_bucket" "critical_logs" {
  bucket        = "logflow-critical-logs-${var.account_id}"
  force_destroy = true

  tags = {
    Project = "LogFlow"
  }
}

resource "aws_s3_bucket_versioning" "critical_logs" {
  bucket = aws_s3_bucket.critical_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}