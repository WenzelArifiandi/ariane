import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightConfig from './astro.starlight.config.mjs';

export default defineConfig({
  integrations: [starlight(starlightConfig)],
});