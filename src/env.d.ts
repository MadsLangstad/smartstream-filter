/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLIC_KEY: string
  readonly VITE_STRIPE_PRICE_ID_BASIC: string
  readonly VITE_STRIPE_PRICE_ID_PRO: string
  readonly VITE_STRIPE_PRICE_ID_LIFETIME: string
  readonly VITE_STRIPE_PRICE_ID_BASIC_YEARLY?: string
  readonly VITE_STRIPE_PRICE_ID_PRO_YEARLY?: string
  readonly VITE_STRIPE_WEBHOOK_SECRET?: string
  readonly VITE_API_URL: string
  readonly VITE_ENABLE_SPOTIFY?: string
  readonly VITE_ENABLE_NETFLIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}