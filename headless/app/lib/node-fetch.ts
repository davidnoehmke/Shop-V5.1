/** Oxygen accepts streamed uploads directly; Node's Fetch API requires duplex. */
export function withNodeStreamUploads(fetcher: typeof fetch): typeof fetch {
  return (input, init) => {
    if (init?.body instanceof ReadableStream) {
      return fetcher(input, {...init, duplex: 'half'} as RequestInit);
    }
    return fetcher(input, init);
  };
}
