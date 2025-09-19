all:
  children:
    database:
      hosts:
        postgres:
          ansible_host: ${postgresql_ip}
          ansible_user: ubuntu
          ansible_ssh_private_key_file: ~/.ssh/id_ed25519
          ansible_ssh_common_args: '-o StrictHostKeyChecking=no -o ProxyJump=root@${proxmox_host}'

          # PostgreSQL configuration
          postgres_version: "16"
          postgres_data_dir: "/var/lib/postgresql/16/main"
          postgres_max_connections: 200
          postgres_shared_buffers: "4GB"
          postgres_effective_cache_size: "10GB"
          postgres_work_mem: "32MB"
          postgres_maintenance_work_mem: "1GB"

          # pgBackRest configuration
          pgbackrest_enabled: true
          backup_retention_days: 14

          # Monitoring
          postgres_exporter_enabled: true
          postgres_exporter_port: 9187

    kubernetes:
      hosts:
        k3s-master:
          ansible_host: ${k8s_ip}
          ansible_user: ubuntu
          ansible_ssh_private_key_file: ~/.ssh/id_ed25519
          ansible_ssh_common_args: '-o StrictHostKeyChecking=no -o ProxyJump=root@${proxmox_host}'

          # K3s configuration
          k3s_role: "master"
          k3s_server_location: "/var/lib/rancher/k3s"
          k3s_become: true

          # Zitadel configuration
          zitadel_domain: "auth.wenzelarifiandi.com"
          zitadel_db_host: ${postgresql_ip}

          # Monitoring
          prometheus_enabled: true
          grafana_enabled: true

    cell_v0:
      children:
        database:
        kubernetes:
      vars:
        # Global settings
        ansible_python_interpreter: /usr/bin/python3

        # Cell v0 specific
        cell_name: "v0"
        environment: "production"
        backup_storage_type: "s3"  # or "b2"

        # Network security
        firewall_enabled: true
        postgres_allowed_hosts:
          - ${k8s_ip}
          - "127.0.0.1"