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
        '18': '4.5rem', // 72px for navbar height spacing
        '20': '5rem',   // 80px for section top padding
      },
      borderRadius: {
        'hero': '28px',
        'glass': 'var(--ariane-glass-radius, 20px)',
        'card': '14px',
      },
      minHeight: {
        'hero': 'clamp(360px, 56vh, 640px)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(60% 60% at 50% 0%, var(--tw-gradient-stops))',
      },
      fontSize: {
        'display': ['clamp(3rem, 3.5vw + 1rem, 5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'heading': ['clamp(1.5rem, 1.5vw + 1rem, 2rem)', { lineHeight: '1.2' }],
        'body': ['clamp(1rem, 0.2vw + 0.9rem, 1.125rem)', { lineHeight: '1.5' }],
      },
      maxWidth: {
        'container': '1100px',
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
