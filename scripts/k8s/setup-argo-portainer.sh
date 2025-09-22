#!/usr/bin/env bash
set -euo pipefail

# This script installs Argo CD and Portainer on a k3s cluster and outputs access info.
# Run on the k3s master node (or with KUBECONFIG pointed at the cluster).

# Prereqs: kubectl installed and pointing to the cluster
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found"; exit 1; }

# 1) Argo CD
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for Argo CD server
kubectl rollout status -n argocd deploy/argocd-server --timeout=180s || true

# Expose via NodePort by default (adjust to LoadBalancer if you have one)
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: argocd-server-nodeport
  namespace: argocd
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: argocd-server
  ports:
    - name: https
      port: 443
      targetPort: 8080
      nodePort: 30443
EOF

# 2) Portainer (Kubernetes agent)
kubectl create namespace portainer --dry-run=client -o yaml | kubectl apply -f -
# Deploy Portainer via the official Helm manifest
kubectl apply -n portainer -f https://raw.githubusercontent.com/portainer/k8s/master/deploy/manifests/portainer.yaml

# Expose via NodePort for simplicity
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: portainer-nodeport
  namespace: portainer
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: portainer
  ports:
    - name: http
      port: 9000
      targetPort: 9000
      nodePort: 30900
EOF

# 3) metrics-server for Lens resource metrics
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Tolerate self-signed certs in lab environments (optional)
kubectl -n kube-system patch deploy metrics-server \
  --type='json' -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]' || true

# Output admin secrets and nodeports
ARGO_PWD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' 2>/dev/null | base64 -d || echo "<unknown>")
PORTAINER_NODEPORT=30900
ARGO_NODEPORT=30443

cat <<INFO

Argo CD:
  URL: https://<k3s-node-ip>:${ARGO_NODEPORT}
  User: admin
  Pass: ${ARGO_PWD}

Portainer:
  URL: http://<k3s-node-ip>:${PORTAINER_NODEPORT}

Lens:
  - Copy kubeconfig from /etc/rancher/k3s/k3s.yaml (on the master) or run:
      sudo cat /etc/rancher/k3s/k3s.yaml > ~/k3s.yaml
      sed -i '' 's/127.0.0.1/<k3s-node-ip>/g' ~/k3s.yaml   # macOS BSD sed
    Then import ~/k3s.yaml into Lens.

INFO
