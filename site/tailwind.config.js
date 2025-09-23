import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typographyPlugin from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Ariane design system colors from global.css
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
        // Standardize on Inter everywhere
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', ...defaultTheme.fontFamily.sans],
        serif: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', ...defaultTheme.fontFamily.serif],
        heading: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', ...defaultTheme.fontFamily.sans],
      },
      spacing: {
        // Custom spacing from CSS custom properties
        'pad-x': 'clamp(1rem, 4vw, 2rem)',
      },
      borderRadius: {
        // Custom radius from global.css
        DEFAULT: '12px',
        'card': '14px',
        'hero': '28px',
      },
      boxShadow: {
        // Custom shadow from global.css
        'soft': '0 8px 24px rgba(0, 0, 0, 0.06)',
      },
      fontSize: {
        // Custom type scale from global.css converted to responsive
        'display': ['clamp(3rem, 3.5vw + 1rem, 5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'heading': ['clamp(1.5rem, 1.5vw + 1rem, 2rem)', { lineHeight: '1.2' }],
        'body': ['clamp(1rem, 0.2vw + 0.9rem, 1.125rem)', { lineHeight: '1.5' }],
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
      // Container settings for consistent max-widths
      container: {
        center: true,
        padding: {
          DEFAULT: 'clamp(1rem, 4vw, 2rem)',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1100px', // Match .wrap/.page-wrap max-width
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
