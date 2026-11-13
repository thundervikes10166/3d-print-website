// Public, read-only: serves store product photos saved by listing-image-upload.
// Keys are random UUIDs and never reused, so responses can be cached forever.
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'listing-images';
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const TYPE_BY_EXTENSION = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

const notFound = () => new Response('Image not found.', {
  status: 404,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed.', { status: 405 });
  const key = new URL(req.url).searchParams.get('key') || '';
  const match = key.match(KEY_PATTERN);
  if (!match) return notFound();

  try {
    const store = getStore({ name: STORE_NAME, consistency: 'strong' });
    const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!result) return notFound();
    const cache = 'public, max-age=31536000, immutable';
    return new Response(req.method === 'HEAD' ? null : result.data, {
      status: 200,
      headers: {
        // Never trust stored metadata for the type: derive it from the validated key.
        'Content-Type': TYPE_BY_EXTENSION[match[1]],
        'Cache-Control': cache,
        'Netlify-CDN-Cache-Control': cache,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('listing-image:', error);
    return new Response('Image temporarily unavailable.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
