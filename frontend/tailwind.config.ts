import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CSS variable-based colors for shadcn/ui compatibility
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
        // Maritime "instrument deck" brand palette (the new identity).
        // Replaces the old institution-specific lamc-* tokens (removed after
        // usages are migrated). See docs/DESIGN_HANDOFF.md §4.
        ground: '#F3F6FB', // app background (sea-fog)
        surface: {
          DEFAULT: '#FFFFFF', // cards
          2: '#EEF2F8', // inset / hover
        },
        brand: {
          ink: '#0D2236', // navy chrome / sidebar / headings
          'ink-soft': '#1B3A57', // secondary navy
          text: '#16273A', // body text
          muted: '#5B6B80', // secondary text
          line: '#D8E0EB', // hairlines
          primary: '#1F5BD0', // signal blue — actions / links
          'primary-hover': '#1A4FB5', // pressed
          'primary-bg': '#E8F0FC', // primary soft fill
          accent: '#E0A100', // brass amber — the Golden Thread (use sparingly)
          'on-ink': '#E7EEF6', // text on navy
          'on-ink-muted': '#8DA3BC', // muted text on navy
          'success-bg': '#E7F6EF', // approved soft fill
          'review-bg': '#FBF1DE', // in-review soft fill
        },
        // Status colors (maritime)
        status: {
          draft: '#64748B',
          review: '#C77F0A',
          validated: '#2563EB',
          approved: '#0E9F6E',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Archivo', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
