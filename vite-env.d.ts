// Fix: Replaced missing 'vite/client' reference with manual declarations
declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
}

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.webp';

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // Add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
