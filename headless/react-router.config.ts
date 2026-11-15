import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

// The Vercel React Router preset generates its own server entry. Combining it
// with Hydrogen's custom worker entry produces an incompatible server bundle
// (the Vercel adapter expects build.future.v8_middleware to exist).
// Keep Hydrogen's server build and let the Vercel worker adapter invoke it.
export default {
  ssr: true,
  presets: [hydrogenPreset()],
  future: {
    v8_middleware: true,
  },
} satisfies Config;
