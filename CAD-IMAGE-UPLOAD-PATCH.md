# Thunder Vikes CAD Request: Image Upload + Filament Descriptions

This patch is designed to be applied **after** `thunder-vikes-cad-workflow-patch.zip`.

## Changes

- CAD quote request form accepts one optional JPG, PNG, or WebP image (max 5 MB).
- Image selection displays a preview and a Remove button.
- The original external STL/photo URL field remains, and customers can supply **both**.
- Uploaded image URL and Storage path are stored on the Firestore request.
- The uploaded photo is visible in staff CAD Request cards, student maker cards, and My Requests.
- The existing PLA, PLA+, PETG, TPU, and ABS choices now have short descriptions in the select menu and underneath it.
- No Netlify Functions or extra npm packages are needed: the existing `firebase` dependency includes Storage.

## Install in Codespaces

Upload the patch ZIP into the repository root, then run:

```bash
unzip -o thunder-vikes-cad-image-upload-patch.zip
rm thunder-vikes-cad-image-upload-patch.zip
npm install
npm run build
```

When the build succeeds, commit and push to your existing main branch:

```bash
git add -A
git commit -m "Add CAD request image uploads and filament descriptions"
git push origin main
```

## Required Firebase setup for uploading images

1. In Firebase Console, open the `robotics-and-coding-exchange` project, then **Storage**. Create/enable a bucket if necessary. **Firebase Cloud Storage requires the Blaze (pay-as-you-go) plan**; no-charge allowance may apply but a billing account must be connected. You do not need Netlify Functions.
2. In **Storage > Rules**, publish the supplied `storage.rules` rules. **If you already have Storage rules for other features, merge the new `match /cad-request-images/{userId}/{fileName}` block into your existing rules instead of replacing them.** Do not confuse Storage rules with Firestore rules.
   - Alternatively, if your Firebase CLI is already configured for the correct project, `firebase deploy --only storage` will publish the `storage.rules` referenced by this patch's `firebase.json`. Verify the active project first.
3. Get the **actual** bucket name from Firebase Console > Project Settings > General > Your apps > Firebase config, or from the Storage page. New buckets typically end in `.firebasestorage.app`. In your Codespaces `.env` and **Netlify Site configuration > Environment variables**, set `VITE_FIREBASE_STORAGE_BUCKET` to that exact name. This project reads it from `src/lib/firebase.ts`. Redeploy Netlify after changing environment variables.
4. Sign in to the storefront and submit a CAD request with a small JPG/PNG/WebP image. Check that the file is created under `cad-request-images/` in Firebase Storage and the photo appears on the request in the staff dashboard.

### Access / privacy

Only signed-in users can upload images to their own Storage folder. Files cannot be listed. Saved Firebase download URLs contain an access token: anyone with the tokenized URL can view the uploaded image, so **do not use this feature for confidential or personal images**. Keep uploads limited to reference images of objects to print. The Storage rules validate image MIME type and file size, but they do not scan files for malicious content.

If your Firebase project remains on the free Spark plan, the original external STL/photo link still works; direct image uploads will not function until Storage is configured on Blaze. Empty image fields do not block regular quote requests.

## Verification

The modified TypeScript/TSX files were checked for syntax errors. A complete `npm run build` could not be performed in the authoring environment because dependencies are not available in the local package cache. Run the build in Codespaces after unzipping.
