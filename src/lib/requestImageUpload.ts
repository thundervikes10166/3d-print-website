import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { app } from './firebase';

export const MAX_REQUEST_IMAGE_BYTES = 5 * 1024 * 1024;
export const REQUEST_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function validateRequestImage(file: File): string | null {
  if (!REQUEST_IMAGE_TYPES.includes(file.type as typeof REQUEST_IMAGE_TYPES[number])) {
    return 'Please select a JPG, PNG, or WebP image.';
  }
  if (file.size > MAX_REQUEST_IMAGE_BYTES) {
    return 'The image must be 5 MB or smaller.';
  }
  if (file.size === 0) {
    return 'The image file is empty.';
  }
  return null;
}

function configuredStorage() {
  // Make configuration failures explicit rather than silently dropping the upload.
  if (!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim()) {
    throw new Error('Image uploads are not configured. Set VITE_FIREBASE_STORAGE_BUCKET in your Netlify environment and local .env.');
  }
  return getStorage(app);
}

export async function uploadRequestImage(file: File, userId: string) {
  const error = validateRequestImage(file);
  if (error) throw new Error(error);

  const imagePath = `cad-request-images/${userId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const imageRef = ref(configuredStorage(), imagePath);
  await uploadBytes(imageRef, file, { contentType: file.type });

  try {
    const imageUrl = await getDownloadURL(imageRef);
    return { imageUrl, imagePath };
  } catch (error) {
    // An upload without a download URL is unusable; clean up when possible.
    await deleteObject(imageRef).catch(() => {});
    throw error;
  }
}

export async function deleteUploadedRequestImage(imagePath: string) {
  await deleteObject(ref(configuredStorage(), imagePath));
}
