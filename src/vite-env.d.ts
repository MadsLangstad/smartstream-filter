/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE: string
  readonly NODE_ENV: 'development' | 'production' | 'test'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}