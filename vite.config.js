import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/cuenta-conmigo-pos-frontend/' : '/',
  plugins: [
    react(),
    tailwindcss()
  ]
})
