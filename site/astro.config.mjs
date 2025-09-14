import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';

export default defineConfig({
  adapter: vercel(),
  output: 'server',
  image: {
    domains: ['cdn.sanity.io']
  },
  vite: {
    build: { sourcemap: false }
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    icon(),
  ],
});
