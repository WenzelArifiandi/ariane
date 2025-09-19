# SOPS Encryption Setup for Cell v0

This directory uses SOPS (Secrets OPerationS) for encrypting sensitive configuration values.

## Setup

### 1. Install SOPS and age

```bash
# macOS
brew install sops age

# Ubuntu/Debian
curl -LO https://github.com/mozilla/sops/releases/latest/download/sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
sudo chmod +x /usr/local/bin/sops

curl -LO https://github.com/FiloSottile/age/releases/latest/download/age-v1.1.1-linux-amd64.tar.gz
tar xzf age-v1.1.1-linux-amd64.tar.gz
sudo mv age/age* /usr/local/bin/
```

### 2. Generate Age Key

```bash
# Generate a new age key pair
age-keygen -o ~/.config/sops/age/keys.txt

# The public key will be displayed - add it to .sops.yaml
```

### 3. Update .sops.yaml

Replace the placeholder age key in `.sops.yaml` with your generated public key.

### 4. Encrypt Secrets Files

```bash
# Encrypt the main secrets file
sops -e -i secrets/cell-v0.yml

# Encrypt group vars secrets
sops -e -i group_vars/all/secrets.yml
```

## Usage

### Editing Encrypted Files

```bash
# Edit encrypted files
sops secrets/cell-v0.yml
sops group_vars/all/secrets.yml
```

### Running Ansible with SOPS

Ansible will automatically decrypt SOPS files during playbook execution if the age key is available.

### GitHub Actions Integration

Add the age private key as a GitHub secret named `SOPS_AGE_KEY`:

```yaml
- name: Setup SOPS
  run: |
    echo "${{ secrets.SOPS_AGE_KEY }}" > ~/.config/sops/age/keys.txt
    chmod 600 ~/.config/sops/age/keys.txt
```

## Security Notes

- Never commit unencrypted secrets files
- Store the age private key securely (password manager, GitHub secrets)
- Rotate secrets regularly
- Use different age keys for different environments
- The age public key can be safely committed to version control

## File Structure

```
ansible/
├── .sops.yaml                    # SOPS configuration
├── secrets/
│   └── cell-v0.yml              # Main encrypted secrets
└── group_vars/all/
    └── secrets.yml              # Encrypted group variables
```