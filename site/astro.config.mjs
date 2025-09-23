import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import react from "@astrojs/react";
import { storyblok } from "@storyblok/astro";

export default defineConfig({
  adapter: vercel(),
  output: "server",
  image: {
    domains: ["cdn.sanity.io"],
  },
  vite: {
    build: { sourcemap: false },
    server: (() => {
      const CF_TUNNEL_HOST = import.meta.env.CF_TUNNEL_HOST;
      const useTunnel = Boolean(CF_TUNNEL_HOST);
      return {
        host: "127.0.0.1",
        port: 4321,
        strictPort: true,
        // Allow all hosts in dev so Cloudflare Tunnel can forward requests with your domain.
        // Safe in development only.
        allowedHosts: ["localhost", "127.0.0.1", "tunnel.wenzelarifiandi.com"],
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
  integrations: [
    tailwind({ applyBaseStyles: true }),
    icon(),
    react(),
    storyblok({
      accessToken: process.env.STORYBLOK_TOKEN,
      components: {
        page: "components/storyblok/Page.astro",
        hero: "components/storyblok/Hero.astro",
        project: "components/storyblok/Project.astro",
      },
    }),
  ],
});
