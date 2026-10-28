import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

const presets: Config['presets'] = [hydrogenPreset()];

if (process.env.VERCEL) {
  const vercelPresetModule = '@vercel/react-router/vite';
  const {vercelPreset} = await import(vercelPresetModule);
  presets.push(vercelPreset());
}

export default {
  ssr: true,
  presets,
} satisfies Config;
