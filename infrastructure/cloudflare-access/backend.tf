# Terraform Backend Configuration
# Using local backend for now - state is lost between CI runs
# Resources are imported fresh each run via ensure-imports.sh

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
