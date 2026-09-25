provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "logflow" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "logflow-vpc"
  }
}

resource "aws_internet_gateway" "logflow" {
  vpc_id = aws_vpc.logflow.id

  tags = {
    Name = "logflow-igw"
  }
}