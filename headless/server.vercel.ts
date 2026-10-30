import hydrogenWorker from './server';
import {withNodeStreamUploads} from './app/lib/node-fetch';

// Hydrogen forwards the incoming body stream for same-origin consent/API calls.
// Apply this only in the Node adapter; do not change the Oxygen runtime.
globalThis.fetch = withNodeStreamUploads(globalThis.fetch);

class MemoryCache {
  private readonly responses = new Map<string, Response>();

  private key(request: RequestInfo | URL) {
    if (typeof request === 'string') return request;
    if (request instanceof URL) return request.toString();
    return request.url;
  }

  async match(request: RequestInfo | URL) {
    return this.responses.get(this.key(request))?.clone();
  }

  async put(request: RequestInfo | URL, response: Response) {
    this.responses.set(this.key(request), response.clone());
  }

  async delete(request: RequestInfo | URL) {
    return this.responses.delete(this.key(request));
  }
}

const memoryCache = new MemoryCache();

if (!('caches' in globalThis)) {
  Object.defineProperty(globalThis, 'caches', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: {
      open: async () => memoryCache,
    } as unknown as CacheStorage,
  });
}

const executionContext = {
  waitUntil(promise: Promise<unknown>) {
    void promise.catch((error) => console.error(error));
  },
  passThroughOnException() {},
} as unknown as ExecutionContext;

export default async function handleVercelRequest(request: Request) {
  return hydrogenWorker.fetch(
    request,
    process.env as unknown as Env,
    executionContext,
  );
}
