import { defineConfig } from 'vite'

export default defineConfig({
  base: '/infinite-gun-game/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
