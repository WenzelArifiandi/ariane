# k3s Add‑ons on Proxmox (neve)

This folder contains helper scripts to set up Argo CD, Portainer, and Lens on a k3s cluster.

Prereqs:

- k3s installed on a VM (e.g., `k8s-master`) and accessible via SSH
- `kubectl` on that VM or from your workstation with KUBECONFIG pointing to the cluster

Scripts:

- `setup-argo-portainer.sh` — Installs Argo CD, Portainer, and metrics-server, and exposes NodePorts
- `export-kubeconfig-for-lens.sh` — Copies/patches k3s kubeconfig so Lens can connect

Quick start (run on k3s master VM):

```bash
# 1) Install add-ons
bash scripts/k8s/setup-argo-portainer.sh

# 2) Export kubeconfig for Lens (requires sudo)
sudo bash scripts/k8s/export-kubeconfig-for-lens.sh /home/ubuntu/k3s.yaml
```

Access:

- Argo CD: `https://<k3s-node-ip>:30443` (user `admin`, password from secret)
- Portainer: `http://<k3s-node-ip>:30900`
- Lens: Import the exported kubeconfig and point the server host to your node IP if needed

Notes:

- For a production ingress, replace NodePort services with an Ingress (nginx-ingress) and TLS via cert-manager
- Ensure firewall allows the chosen NodePort ranges or switch to LoadBalancer with MetalLB in your lab network

Optional: MetalLB (LoadBalancer IPs on bare-metal)

1. Install MetalLB:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
```

2. Configure an address pool that matches your Proxmox/LAN network (example uses 10.98.0.200-10.98.0.250):

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
	name: default-pool
	namespace: metallb-system
spec:
	addresses:
		- 10.98.0.200-10.98.0.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
	name: default
	namespace: metallb-system
```

3. Switch Argo CD/Portainer Services to `type: LoadBalancer` or add Ingress resources and TLS via cert-manager.
