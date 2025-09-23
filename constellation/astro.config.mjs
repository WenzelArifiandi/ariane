import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightConfig from './astro.starlight.config.mjs';
import vercel from '@astrojs/vercel';

export default defineConfig({
  adapter: vercel(),
  output: 'server',
  integrations: [starlight(starlightConfig)],
});
