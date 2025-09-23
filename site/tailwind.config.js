import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typographyPlugin from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--aw-color-primary)',
        secondary: 'var(--aw-color-secondary)',
        accent: 'var(--aw-color-accent)',
        default: 'var(--aw-color-text-default)',
        muted: 'var(--aw-color-text-muted)',
        // Custom palette from global.css
        wisteria: '#8b7cf0',
        lilac: '#eee9ff',
        salmon: '#ff8e7a',
        sakura: '#ffd5dc',
        mauve: '#b99ad9',
        // Layout colors
        ink: 'var(--ink)',
        page: 'var(--page)',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', ...defaultTheme.fontFamily.sans],
        serif: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', ...defaultTheme.fontFamily.serif],
        heading: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', ...defaultTheme.fontFamily.sans],
      },
      spacing: {
        'pad-x': 'clamp(1rem, 4vw, 2rem)',
      },
      borderRadius: {
        'hero': '28px',
      },
      minHeight: {
        'hero': 'clamp(360px, 56vh, 640px)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(60% 60% at 50% 0%, var(--tw-gradient-stops))',
      },
      animation: {
        fade: 'fadeInUp 1s both',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(2rem)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    typographyPlugin,
    plugin(({ addVariant }) => {
      addVariant('intersect', '&:not([no-intersect])');
    }),
  ],
  darkMode: 'class',
};
