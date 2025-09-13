import { defineConfig } from 'astro/config'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  vite: { plugins: [tailwind()] },
  server: { host: true },
})

