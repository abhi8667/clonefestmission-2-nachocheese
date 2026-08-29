/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#040711',
        surface: {
          50: '#080d1a',
          100: '#0d1527',
          200: '#121d36',
          300: '#1a2747',
          400: '#27385f',
          500: '#384d7d'
        },
        cyber: {
          bg: '#040711',
          card: '#080e1e',
          cardHover: '#0d1730',
          border: 'rgba(34, 211, 238, 0.15)',
          borderHover: 'rgba(34, 211, 238, 0.35)',
          neon: '#00F59B',
          cyan: '#00E5FF',
          blue: '#0EA5E9',
          amber: '#F59E0B',
          red: '#FF2A55',
          purple: '#A855F7',
          slate: '#64748B'
        },
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        stalled: {
          bg: 'rgba(255, 42, 85, 0.12)',
          border: '#FF2A55',
          text: '#FFA3B5',
          glow: 'rgba(255, 42, 85, 0.35)'
        },
        accent: {
          cyan: '#00E5FF',
          emerald: '#00F59B',
          amber: '#F59E0B',
          violet: '#A855F7',
          rose: '#FF2A55'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        orbit: ['Outfit', 'Inter', 'sans-serif']
      },
      boxShadow: {
        'glow-primary': '0 0 25px -5px rgba(6, 182, 212, 0.45)',
        'glow-cyan': '0 0 25px -3px rgba(0, 229, 255, 0.4)',
        'glow-neon': '0 0 25px -3px rgba(0, 245, 155, 0.4)',
        'glow-amber': '0 0 25px -3px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 25px -3px rgba(255, 42, 85, 0.45)',
        'glow-purple': '0 0 25px -3px rgba(168, 85, 247, 0.45)',
        'cyber-card': '0 8px 32px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'cyber-card-glow': '0 8px 32px 0 rgba(0, 229, 255, 0.1), inset 0 1px 0 0 rgba(0, 229, 255, 0.2)'
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scanline': 'scanline 8s linear infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'terminal-blink': 'terminalBlink 1s step-end infinite',
        'signal-glow': 'signalGlow 2.5s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        terminalBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        signalGlow: {
          '0%': { opacity: '0.4', filter: 'drop-shadow(0 0 2px rgba(0, 229, 255, 0.4))' },
          '100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.8))' }
        }
      }
    },
  },
  plugins: [],
}
