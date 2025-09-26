# PBS on Proxmox via Terraform

## Env vars required
- TF_VAR_token_id        (e.g. root@pam!cli)
- TF_VAR_token_secret    (value printed when token was created)
- TF_VAR_ssh_key         (public key to inject via cloud-init)

## Typical flow
terraform init
terraform plan
terraform apply
