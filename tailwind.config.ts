import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          50: '#f0f7fc',
          100: '#e1effa',
          200: '#bcdff5',
          300: '#82c4ee',
          400: '#41a7e4',
          500: '#0084D5', // Pantone 2173 C
          600: '#006ab3',
          700: '#005490',
          800: '#00477a',
          900: '#013861',
          950: '#012169', // Pantone 280 C
        },
        coolgray: {
          DEFAULT: '#D0D0CE', // Pantone Cool Gray 2 C
          50: '#fafafa',
          100: '#f4f4f4',
          200: '#e5e5e5',
          300: '#D0D0CE',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        gold: {
          400: 'hsl(43, 96%, 56%)',
          500: 'hsl(43, 96%, 52%)',
          600: 'hsl(38, 92%, 40%)',
        },
        dark: {
          950: 'hsl(222, 47%, 5%)',
          900: 'hsl(222, 47%, 8%)',
          800: 'hsl(222, 39%, 12%)',
          700: 'hsl(222, 32%, 17%)',
          600: 'hsl(222, 26%, 22%)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #012169 0%, #0084D5 100%)',
        'gradient-dark': 'linear-gradient(180deg, hsl(222,47%,8%) 0%, hsl(222,47%,5%) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'count-up': 'countUp 1s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        countUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        'glow-brand': '0 0 20px rgba(0, 132, 213, 0.3)',
        'glow-gold': '0 0 20px hsla(43,96%,52%,0.3)',
        'card-dark': '0 4px 24px rgba(0,0,0,0.4)',
        'card-light': '0 4px 24px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
