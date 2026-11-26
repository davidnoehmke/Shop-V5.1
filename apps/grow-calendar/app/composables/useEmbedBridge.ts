export function useEmbedBridge() {
  const route = useRoute()
  const allowedOrigins = ['https://leaferservice.com', 'https://www.leaferservice.com']
  let parentOrigin = ''
  let observer: ResizeObserver | undefined
  let lastHeight = 0
  const report = () => {
    if (!parentOrigin) return
    const height = Math.ceil(document.querySelector('#calendar-app')?.getBoundingClientRect().height || 0)
    if (height > 0 && height !== lastHeight) {
      window.parent.postMessage({ type: 'leaf-grow-height', height }, parentOrigin)
      lastHeight = height
    }
  }
  const receive = (event: MessageEvent) => {
    if (event.source !== window.parent || !allowedOrigins.includes(event.origin) || event.data?.type !== 'leaf-grow-init') return
    parentOrigin = event.origin
    lastHeight = 0
    report()
  }
  watch(() => route.path, () => {
    if (import.meta.client && parentOrigin) window.parent.postMessage({ type: 'leaf-grow-route' }, parentOrigin)
  })
  onMounted(() => {
    if (window.parent === window) return
    window.addEventListener('message', receive)
    try {
      const referrerOrigin = new URL(document.referrer).origin
      if (allowedOrigins.includes(referrerOrigin)) {
        parentOrigin = referrerOrigin
        window.parent.postMessage({ type: 'leaf-grow-ready' }, parentOrigin)
      }
    } catch { /* The parent load handshake also works without a referrer. */ }
    const root = document.querySelector('#calendar-app')
    if (root) { observer = new ResizeObserver(report); observer.observe(root) }
    report()
  })
  onBeforeUnmount(() => { observer?.disconnect(); window.removeEventListener('message', receive) })
}
