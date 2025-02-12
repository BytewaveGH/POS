import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import { PluginAPI } from 'tailwindcss/types/config'

const config: Config = {
  content: ['./src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mulish: ['var(--font-mulish)'],
      },
      fontWeight: {
        'mulish-extra-light': '200',
        'mulish-light': '300',
        'mulish-regular': '400',
        'mulish-semi-bold': '600',
        'mulish-bold': '700',
        'mulish-extra-bold': '800',
        'mulish-black': '900',
      },
      colors: {
        veniceBlue: '#054B81',
        endeavour: '#0865AC',
        cornflowerBlue: '#59B0F2',
        burningOrange: '#FF7433',
        doveGray: '#686868',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    function ({ addUtilities }: PluginAPI) {
      const newUtilities = {
        '.bytewave-heading': {
          fontSize: '1.125rem',
          color: '#0865AC',
        },

        '.bytewave-paragraph': {
          fontSize: '0.875rem',
          // color: '#212120',
        },
        '.bytewave-sub-heading': {
          fontSize: '1rem',
          // color: '#000000',
        },
        '.bytewave-link': {
          fontSize: '0.75rem',
          // color: '#212120',
        },
      }

      addUtilities(newUtilities)
    },
  ],
}
export default config
