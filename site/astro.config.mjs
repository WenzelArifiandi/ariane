import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import react from "@astrojs/react";

export default defineConfig({
  adapter: vercel(),
  output: "server",
  image: {
    domains: ["cdn.sanity.io"],
  },
  vite: {
    build: { sourcemap: false },
    server: (() => {
      const CF_TUNNEL_HOST = process.env.CF_TUNNEL_HOST;
      const useTunnel = Boolean(CF_TUNNEL_HOST);
      return {
        host: "127.0.0.1",
        port: 4321,
        strictPort: true,
        // Allow all hosts in dev so Cloudflare Tunnel can forward requests with your domain.
        // Safe in development only.
        allowedHosts: "all",
        hmr: useTunnel
          ? {
              host: CF_TUNNEL_HOST,
              protocol: "wss",
              clientPort: 443,
            }
          : {
              port: 4321,
            },
      };
    })(),
  },
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
  integrations: [tailwind({ applyBaseStyles: false }), icon(), react()],
});
