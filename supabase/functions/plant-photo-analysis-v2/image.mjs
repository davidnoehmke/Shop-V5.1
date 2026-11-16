// The codec is injected so the exact deployed JPEG path can be tested in Node.
// Only normalized pixels leave this boundary, never EXIF, GPS or embedded data.
export function normalizePhoto(image, codec) {
  try {
    const encoded = image.slice('data:image/jpeg;base64,'.length);
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const decoded = codec.decode(bytes, {
      useTArray: true, tolerantDecoding: false,
      maxResolutionInMP: 3, maxMemoryUsageInMB: 128,
    });
    if (decoded.width < 128 || decoded.height < 128 || decoded.width > 1600 || decoded.height > 1600) throw Error('invalid_image');
    const clean = codec.encode({width: decoded.width, height: decoded.height, data: decoded.data}, 82).data;
    let binary = '';
    for (let offset = 0; offset < clean.length; offset += 8192)
      binary += String.fromCharCode(...clean.subarray(offset, offset + 8192));
    return 'data:image/jpeg;base64,' + btoa(binary);
  } catch {
    throw new Error('invalid_image');
  }
}
