// Removed reference to missing vite/client types
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // Add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};
