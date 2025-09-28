import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import typographyPlugin from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}'],
  safelist: [
    'opacity-100', 'translate-y-0', 'scale-100',
    'opacity-0',   '-translate-y-4', 'scale-[0.97]',
  ],
  theme: {
    screens: {
      'xs': '475px',
      ...defaultTheme.screens,
    },
    extend: {
      colors: {
        primary: 'var(--aw-color-primary)',
        secondary: 'var(--aw-color-secondary)',
        default: 'var(--aw-color-text-default)',
        // Custom palette from global.css
        wisteria: '#8b7cf0',
        lilac: '#eee9ff',
        salmon: '#ff8e7a',
        sakura: '#ffd5dc',
        mauve: '#b99ad9',
        // Layout colors
        ink: 'var(--ink)',
        page: 'var(--page)',
        // Ariane design system colors
        'ink-primary': 'var(--ariane-text-ink)',
        'ink-dim': 'var(--ariane-text-ink-dim)',
        'text-main': 'var(--ariane-body-text)',
        'text-heading': 'var(--ariane-heading-text)',
        muted: 'var(--ariane-subtext)',
        accent: 'var(--ariane-link-text)',
        'accent-hover': 'var(--ariane-link-hover)',
      },
      fontFamily: {
        sans: ['Google Sans'],
        serif: [...defaultTheme.fontFamily.serif],
        heading: ['Google Sans'],
        'google-sans': ['Google Sans'],
      },
      spacing: {
        'pad-x': 'clamp(1rem, 4vw, 2rem)',
        '18': '4.5rem', // 72px for navbar height spacing
        '20': '5rem',   // 80px for section top padding
        '22': '5.5rem', // 88px
        '26': '6.5rem', // 104px
        '28': '7rem',   // 112px
        // Navigation spacing tokens
        'nav-gap': '0.625rem', // 10px - gap between nav items
        'nav-gap-md': '0.75rem', // 12px - gap on md+ screens
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
        'display': ['clamp(3.5rem, 5vw + 1rem, 6rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'heading': ['clamp(1.75rem, 1.6vw + 1rem, 2.25rem)', { lineHeight: '1.2' }],
        'body': ['clamp(1.1rem, 0.3vw + 1rem, 1.25rem)', { lineHeight: '1.65' }],
        // Navigation typography tokens
        'nav-brand-sm': ['17px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'nav-brand-md': ['18px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'nav-brand-lg': ['19px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'nav-brand-xl': ['20px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '600' }],
        'nav-link': ['17px', { lineHeight: '1.1', letterSpacing: '-0.005em', fontWeight: '500' }],
        'nav-link-md': ['18px', { lineHeight: '1.1', letterSpacing: '-0.005em', fontWeight: '500' }],
        'nav-link-lg': ['19px', { lineHeight: '1.1', letterSpacing: '-0.005em', fontWeight: '500' }],
        'nav-link-xl': ['20px', { lineHeight: '1.1', letterSpacing: '-0.005em', fontWeight: '500' }],
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
    plugin(({ addUtilities }) => {
      addUtilities({
        '.glass': {
          'position': 'relative',
          'border-radius': 'var(--glass-radius, 24px)',
          'background': `
            radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, rgba(123, 97, 255, 0.18), transparent 80%) 0%, transparent 62%),
            linear-gradient(180deg, color-mix(in oklab, rgba(123, 97, 255, 0.10), transparent 90%) 0%, color-mix(in oklab, rgba(123, 97, 255, 0.10), transparent 96%) 100%),
            rgba(255,255,255,0.06)
          `,
          'border': '1px solid rgba(123,97,255,0.14)',
          'box-shadow': '0 8px 28px rgba(123,97,255,0.18)',
          'backdrop-filter': 'blur(14px) saturate(1.35) contrast(1.06) brightness(1.02)',
          '-webkit-backdrop-filter': 'blur(14px) saturate(1.35) contrast(1.06) brightness(1.02)',
          '&::before': {
            'content': '""',
            'position': 'absolute',
            'inset': '0',
            'border-radius': 'inherit',
            'pointer-events': 'none',
            'background': 'radial-gradient(80% 45% at 50% 0%, rgba(255,255,255,0.55) 0%, transparent 70%)',
            'mix-blend-mode': 'screen',
            'opacity': '0.55',
          },
          '&::after': {
            'content': '""',
            'position': 'absolute',
            'inset': '-8%',
            'border-radius': 'inherit',
            'pointer-events': 'none',
            'background': `
              radial-gradient(110px 80px at 22% 32%, rgba(255,255,255,0.35) 0%, transparent 62%),
              radial-gradient(150px 100px at 78% 60%, rgba(167,139,250,0.28) 0%, transparent 68%),
              radial-gradient(140px 90px at 48% 92%, rgba(255,155,213,0.22) 0%, transparent 72%)
            `,
            'filter': 'blur(16px) saturate(1.2)',
            'opacity': '0.40',
            'animation': 'liquid-drift 16s ease-in-out infinite alternate',
          },
        },
        '@keyframes liquid-drift': {
          '0%': { transform: 'translateY(-2%) translateX(-1%) scale(1)' },
          '50%': { transform: 'translateY(2%) translateX(1%) scale(1.02)' },
          '100%': { transform: 'translateY(-1%) translateX(2%) scale(1.01)' },
        },
      });
    }),
  ],
  darkMode: 'class',
};
