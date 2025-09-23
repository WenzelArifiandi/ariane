// This file exports *only* the Starlight options object (not defineConfig)
export default {
  title: "Ariane Docs",
  // logo: { src: "/logo.svg", alt: "Ariane" }, // Temporarily removed due to build issues

  // Custom components
  components: {
    Head: './src/components/Head.astro',
    Header: './src/components/Header.astro',
  },

  // Manual sidebar for Starlight 0.36.x
  sidebar: [
    {
      label: "Getting Started",
      items: [
        { label: "Overview", link: "/" },
        { label: "Setup", link: "/setup" },
        { label: "README", link: "/readme" },
        { label: "Constellation Management", link: "/constellation_management" },
        { label: "Color System", link: "/color-system" },
      ]
    },
    {
      label: "Security",
      items: [
        { label: "Security Overview", link: "/security" },
        { label: "Security Automation", link: "/security_automation" },
        { label: "Security Automation Setup", link: "/security_automation_setup" },
        { label: "Security Autofix", link: "/security-autofix" },
        { label: "Security Report", link: "/security-report" },
      ]
    },
    {
      label: "Testing",
      items: [
        { label: "Testing Strategy", link: "/testing_strategy" },
        { label: "Zero Setup Testing", link: "/zero_setup_testing" },
        { label: "Enterprise Testing Free", link: "/enterprise_testing_free" },
      ]
    },
    {
      label: "Infrastructure",
      items: [
        { label: "Claude Instructions", link: "/claude" },
        { label: "Proxmox Server", link: "/proxmox-server" },
        { label: "Trigger Deployment", link: "/trigger_deployment" },
      ]
    },
    {
      label: "Development",
      items: [
        { label: "Copilot Instructions", link: "/copilot-instructions" },
        { label: "Copilot Cheatsheet", link: "/copilot-cheatsheet" },
        { label: "Bazel Evaluation", link: "/bazel_evaluation" },
      ]
    },
    {
      label: "Cloud Services",
      items: [
        { label: "Cloudflare API", link: "/cloudflare_api" },
        { label: "Cloudflare Access GitHub", link: "/cloudflare-access-github" },
        { label: "Backblaze B2", link: "/backblaze_b2" },
        { label: "SOPS", link: "/sops" },
      ]
    },
    {
      label: "Authentication",
      items: [
        { label: "Zitadel User Initialization", link: "/zitadel-user-initialization" },
        { label: "Zitadel Projection Fix", link: "/zitadel-projection-fix" },
        { label: "Zitadel Troubleshooting", link: "/zitadel-cloudflare-access-troubleshooting" },
        { label: "Auth0 README", link: "/readme-auth0" },
      ]
    },
  ],
};