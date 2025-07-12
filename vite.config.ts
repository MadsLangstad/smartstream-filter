import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
        'content-youtube': resolve(__dirname, 'src/content/youtube-header.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: process.env.NODE_ENV === 'development'
  }
})