/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';


// Optional portal authentication; missing values fail closed on auth routes only.
declare global {
  interface Env {
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
  }
}
