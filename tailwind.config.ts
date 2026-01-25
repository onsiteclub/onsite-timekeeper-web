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
        primary: '#4A90D9',
        accent: '#5B9BD5',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
        'text-muted': '#94A3B8',
        border: '#E2E8F0',
      },
    },
  },
  plugins: [],
};
export default config;
