export type PlantPhotoReport = {
  quality: 'sufficient' | 'limited' | 'unusable' | 'not_plant';
  summary: string;
  identification: {
    commonName: string;
    scientificName: string;
    confidence: 'low' | 'medium' | 'high';
    evidence: string;
  }[];
  observations: string[];
  possibleCauses: {
    cause: string;
    confidence: 'low' | 'medium' | 'high';
    evidence: string;
    nextCheck: string;
  }[];
  nextSteps: string[];
  followUpQuestions: string[];
  limitations: string[];
};

// Decode, orient, resize and re-encode: originals and their EXIF/GPS are not uploaded.
export async function preparePlantPhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('invalid_image');
  if (!file.size || file.size > 8 * 1024 * 1024)
    throw new Error('file_too_large');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  } catch {
    throw new Error('invalid_image');
  }
  try {
    if (
      bitmap.width < 128 ||
      bitmap.height < 128 ||
      bitmap.width * bitmap.height > 40_000_000
    )
      throw new Error('image_dimensions');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('invalid_image');
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--leaf-cream')
      .trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.65, 0.45]) {
      const image = canvas.toDataURL('image/jpeg', quality);
      if (image.startsWith('data:image/jpeg;') && image.length <= 1_050_000)
        return image;
    }
    throw new Error('file_too_large');
  } finally {
    bitmap.close();
  }
}
