locals {
  ecr_repos = [
    "logflow-api",
    "logflow-log-ingestion-service",
    "logflow-alert-service",
    "logflow-notification-service",
    "logflow-client",
    "logflow-simulator",
  ]
}

resource "aws_ecr_repository" "repos" {
  for_each = toset(local.ecr_repos)

  name                 = each.value
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = each.value
  }
}