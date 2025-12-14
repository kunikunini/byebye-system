import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#FFFFFF', // White base
          surface: '#F9FAFB', // Light gray for cards/sections
          elevated: '#F3F4F6',
        },
        text: {
          primary: '#05070D', // Dark text
          secondary: '#4B5563', // Gray text
          muted: '#9CA3AF',
        },
        gold: {
          1: '#FFD24D',
          2: '#FFB703',
          3: '#C98F00',
        },
      },
      borderColor: {
        subtle: 'rgba(0,0,0,0.1)', // Dark border for light theme
      },
    },
  },
  plugins: [],
} satisfies Config;

