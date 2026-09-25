terraform {
  backend "s3" {
    bucket         = "logflow-tfstate-sahil22k27"
    key            = "logflow/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "logflow-tf-locks"
    encrypt        = true
  }
}

