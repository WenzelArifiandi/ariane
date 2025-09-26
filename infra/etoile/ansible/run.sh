#!/usr/bin/env bash
set -eux
sudo apt-get update -y
sudo apt-get install -y ansible python3-pip git
ansible-galaxy collection install community.general ansible.posix
ansible-playbook -i "localhost," -c local "$(dirname "$0")/pbs.yml"
