/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PRODUCT_NAME?: string;
  readonly VITE_PRIMARY_COLOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
