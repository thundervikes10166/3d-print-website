import { auth } from './firebase';

// Product photos are resized in the browser, then stored by the Netlify
// function `listing-image-upload` (Netlify Blobs; no Firebase Storage needed).
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const QUALITY = 0.85;

export const LISTING_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export function validateListingImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose a photo (JPG, PNG, or WebP).';
  if (file.size === 0) return 'That photo file is empty.';
  if (file.size > MAX_INPUT_BYTES) return 'That photo is larger than 25 MB. Please choose a smaller one.';
  return null;
}

const canvasToBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

/** Shrinks a photo to at most 1600px on its longest side and re-encodes it. */
export async function prepareListingImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // Honors the phone's EXIF rotation so photos are not sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This photo format cannot be read by your browser. Please use a JPG, PNG, or WebP photo.');
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not process this photo.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const webp = await canvasToBlob(canvas, 'image/webp');
  if (webp && webp.type === 'image/webp') return webp;

  // Browsers without WebP encoding (older Safari): use JPEG on a white
  // background so transparent PNGs do not turn black.
  const flattened = document.createElement('canvas');
  flattened.width = canvas.width;
  flattened.height = canvas.height;
  const flatContext = flattened.getContext('2d')!;
  flatContext.fillStyle = '#ffffff';
  flatContext.fillRect(0, 0, flattened.width, flattened.height);
  flatContext.drawImage(canvas, 0, 0);
  const jpeg = await canvasToBlob(flattened, 'image/jpeg');
  if (!jpeg) throw new Error('Your browser could not process this photo.');
  return jpeg;
}

/** Uploads a product photo and returns the URL to save on the listing. */
export async function uploadListingImage(file: File): Promise<string> {
  const problem = validateListingImage(file);
  if (problem) throw new Error(problem);
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before uploading photos.');

  const image = await prepareListingImage(file);
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch('/.netlify/functions/listing-image-upload', {
      method: 'POST',
      headers: { 'Content-Type': image.type, Authorization: `Bearer ${token}` },
      body: image,
    });
  } catch {
    throw new Error('Could not reach the server to upload the photo. Check your connection and try again.');
  }
  const result = await response.json().catch(() => ({} as { error?: string; url?: string }));
  if (!response.ok || !result.url) {
    throw new Error(result.error || `Photo upload failed (HTTP ${response.status}).`);
  }
  return result.url;
}
