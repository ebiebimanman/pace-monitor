import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages は https://ebiebimanman.github.io/pace-monitor/ に置く
  base: command === 'build' ? '/pace-monitor/' : '/',
}))
