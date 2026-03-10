module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        hub: {
          900: '#061326',
          800: '#0a1d39',
          700: '#112b52',
          500: '#2f7cff'
        }
      }
    }
  },
  plugins: []
}
