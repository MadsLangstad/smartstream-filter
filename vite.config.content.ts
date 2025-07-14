import { defineConfig } from 'vite'
import path from 'path'

// Special config for content scripts (IIFE format)
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
    }
  },
  build: {
    rollupOptions: {
      input: {
        'content-youtube': path.resolve(__dirname, 'src/content/youtube-header.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'SmartStreamFilter',
        // Inline all imports for content scripts
        inlineDynamicImports: true
      }
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    target: 'es2020'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.VITE_DEMO_MODE': JSON.stringify(process.env.VITE_DEMO_MODE || 'false')
  }
})