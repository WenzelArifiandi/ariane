# Terraform Backend Configuration
# Using local backend with nuke-and-recreate strategy
# State is lost between CI runs but resources are deleted/recreated each time
# This is simple and reliable - no state drift issues

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Future: Consider Cloudflare R2 or Terraform Cloud for remote state
# to avoid recreating resources on every run
