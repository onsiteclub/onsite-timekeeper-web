import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F5B800',
          light: '#FFF4CC',
          dark: '#D4A000',
        },
        accent: '#2E7D32',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        'text-primary': '#1A1A1A',
        'text-secondary': '#666666',
        'text-muted': '#999999',
        border: '#E5E5E5',
        'nav-inactive': '#9E9E9E',
      },
    },
  },
  plugins: [],
};
export default config;
