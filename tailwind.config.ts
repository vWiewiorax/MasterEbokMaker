import { type Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

export const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-white': '#ffffffcc',
      },
      typography: {
        invert: {
          css: {
            color: '#ffffff',
            a: { color: '#ffffff', textDecoration: 'underline' },
            strong: { color: '#ffffff' },
            em: { color: '#ffffffe6' },
            p: { color: '#cccccc', marginBottom: '1.5rem' },
            h2: { color: '#ffffff', marginBottom: '1rem', fontFamily: 'serif' },
            h3: { color: '#ffffff', fontFamily: 'serif' },
            blockquote: { borderLeftColor: '#ffffff4d', color: '#ffffff99' },
            ul: { color: '#ffffffb3' },
            ol: { color: '#ffffffb3' },
            img: { borderRadius: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' },
          }
        }
      }
    }
  },
  plugins: [typography],
}
