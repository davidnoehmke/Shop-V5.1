import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

const presets: Config['presets'] = [];

if (process.env.VERCEL) {
  const {vercelPreset} = await import('@vercel/react-router/vite');
  presets.push(vercelPreset());
} else {
  presets.push(hydrogenPreset());
}

export default {
  ssr: true,
  presets,
} satisfies Config;
