import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth':      'http://localhost:5000',
      '/ride':      'http://localhost:5000',
      '/booking':   'http://localhost:5000',
      '/users':     'http://localhost:5000',
      '/ratings':   'http://localhost:5000',
      '/kyc':       'http://localhost:5000',
      '/tracking':  'http://localhost:5000',
      '/chat':      'http://localhost:5000',
      '/admin':     'http://localhost:5000',
      '/alerts':    'http://localhost:5000',
      '/sos':       'http://localhost:5000',
      '/incidents': 'http://localhost:5000',
      '/notifications': 'http://localhost:5000',
      '/dev':       'http://localhost:5000',
    }
  }
})
