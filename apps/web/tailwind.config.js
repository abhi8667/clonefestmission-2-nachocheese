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
        background: '#080808',
        foreground: '#F2F1EA',
        surface: {
          50: '#0c0c0c',
          100: '#121212',
          200: '#181818',
          300: '#222222',
          400: '#2c2c2c',
          500: '#383838'
        },
        border: 'rgba(242, 241, 234, 0.15)',
        muted: {
          DEFAULT: '#141414',
          // WCAG 2.2 AA: #737373 measured 3.67:1–4.22:1 against our surfaces,
          // below the 4.5:1 normal-text threshold. #8A8A8A clears it on every
          // surface (5.04:1 on #1a1a1a → 5.80:1 on #080808).
          foreground: '#8A8A8A'
        },
        accent: {
          orange: '#B497CF',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#ef4444',
          cyan: '#00e5ff',
          purple: '#a855f7'
        },
        cyber: {
          bg: '#080808',
          card: '#0e0e0e',
          cardHover: '#141414',
          border: 'rgba(242, 241, 234, 0.2)',
          borderHover: 'rgba(234, 88, 12, 0.8)',
          orange: '#B497CF',
          neon: '#10b981',
          cyan: '#00e5ff',
          amber: '#f59e0b',
          red: '#ef4444',
          slate: '#8A8A8A' // matches muted.foreground — see AA note above
        },
        stalled: {
          bg: 'rgba(234, 88, 12, 0.12)',
          border: '#B497CF',
          text: '#fb923c',
          glow: 'rgba(234, 88, 12, 0.35)'
        }
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        pixel: ['JetBrains Mono', 'monospace'],
        orbit: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'brutalist': '4px 4px 0px 0px rgba(242, 241, 234, 0.2)',
        'brutalist-orange': '4px 4px 0px 0px #B497CF',
        'brutalist-white': '4px 4px 0px 0px #F2F1EA',
        'glow-orange': '0 0 25px -3px rgba(234, 88, 12, 0.45)',
        'glow-cyan': '0 0 25px -3px rgba(0, 229, 255, 0.4)',
        'glow-neon': '0 0 25px -3px rgba(16, 185, 129, 0.4)',
        'cyber-card': '0 0 0 1px rgba(242, 241, 234, 0.15)'
      },
      animation: {
        'blink': 'terminalBlink 1s step-end infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.15s ease-out forwards',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'marquee': 'marquee 25s linear infinite',
        'glitch': 'glitch 3s infinite'
      },
      keyframes: {
        terminalBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' }
        }
      }
    },
  },
  plugins: [],
}
