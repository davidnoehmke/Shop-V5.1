import {modelContext} from './contract.mjs';

export async function analyzePhoto({key, instructions, input, schema, signal, model, fetcher = fetch}) {
  const response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
    signal: AbortSignal.any([signal, AbortSignal.timeout(40_000)]),
    body: JSON.stringify({
      model, store: false, instructions, max_output_tokens: 3600,
      input: [{role: 'user', content: [
        {type: 'input_text', text: modelContext(input)},
        ...input.images.map(image => ({type: 'input_image', image_url: image, detail: 'high'})),
      ]}],
      text: {format: {type: 'json_schema', name: 'plant_photo_report', strict: true, schema}},
    }),
  });
  if (response.status === 429) throw new Error('provider_rate_limited');
  if (!response.ok) throw new Error('provider_unavailable');
  // Bound provider output too. No raw provider response is logged or returned.
  if (!response.body) throw new Error('incomplete_output');
  const reader = response.body.getReader();
  const parts = [];
  let length = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 200_000) {await reader.cancel(); throw new Error('invalid_model_output');}
      parts.push(value);
    }
  } finally {reader.releaseLock();}
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {bytes.set(part, offset); offset += part.length;}
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (payload.status !== 'completed') throw new Error('incomplete_output');
  const text = (payload.output || []).flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('');
  return {report: JSON.parse(text), model};
}
