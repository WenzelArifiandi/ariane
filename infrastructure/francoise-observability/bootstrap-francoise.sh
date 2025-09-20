#!/bin/bash
set -euo pipefail

echo "🔧 Bootstrapping Françoise Observability Stack..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
echo "🐳 Installing Docker..."
sudo apt install -y docker.io docker-compose-plugin curl wget

# Enable Docker
sudo systemctl enable docker --now
sudo usermod -aG docker ubuntu

# Create observability directories
echo "📁 Setting up directories..."
mkdir -p ~/observability-stack/{rules,grafana/{provisioning,dashboards}}

# Copy configuration files
echo "📋 Setting up configuration..."
cp docker-compose.yml ~/observability-stack/
cp prometheus.yml ~/observability-stack/
cp loki.yml ~/observability-stack/
cp promtail.yml ~/observability-stack/
cp alertmanager.yml ~/observability-stack/
cp -r rules/ ~/observability-stack/

# Create log directories for Terraform/Ansible
sudo mkdir -p /var/log/{terraform,ansible}
sudo chown ubuntu:ubuntu /var/log/{terraform,ansible}

# Set up Grafana provisioning
echo "🎯 Setting up Grafana provisioning..."
cat > ~/observability-stack/grafana/provisioning/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
EOF

# Create Grafana dashboard for infrastructure
cat > ~/observability-stack/grafana/dashboards/infrastructure.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Neve Infrastructure Overview",
    "tags": ["infrastructure", "proxmox"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "VM Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{instance}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

# Start the observability stack
echo "🚀 Starting observability stack..."
cd ~/observability-stack
docker compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Show status
echo "✅ Françoise Observability Stack Status:"
docker compose ps

echo ""
echo "🎉 Françoise is ready! Access your dashboards:"
echo "📊 Grafana: http://10.98.0.200:3000 (admin/admin123)"
echo "📈 Prometheus: http://10.98.0.200:9090"
echo "📝 Loki: http://10.98.0.200:3100"
echo "🚨 Alertmanager: http://10.98.0.200:9093"
echo ""
echo "👑 Françoise is now watching over your entire Neve infrastructure!"