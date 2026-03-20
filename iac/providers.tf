terraform {
  backend "s3" {
    bucket = "registry-terraform-storage-266cc05"
    region = "eu-west-2"
    key    = "state/development.tfstate"
  }
}

provider "aws" {
  region = var.region
}
