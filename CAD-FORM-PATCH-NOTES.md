# Thunder Vikes Store: Listing Categories + CAD Quote Form Patch

This patch was made from the previously updated 3D-print store project, preserving the admin sign-in and listing changes from that version.

## Changes

- **Product listing categories:** adds `Toys` and `Woodwork`, removes `Tools` from the listing drop-down and public category filters. Existing Firestore products or category documents are not deleted or migrated.
- **CAD quote form:** blank text inputs (no placeholders or contact auto-fill), no request category, optional URL to a shareable STL or photo, material selector, solid-color vs multicolor choice with text field for preferred color(s), and approximate size choices: Small (3 in x 3 in), Medium (6 in x 6 in), Large (10 in x 10 in), X-Large (12 in+).
- **Quote disclosure:** clearly says the team will contact the requester with a price estimate before printing. Submitting the form **does not** start the print.
- **Saved requests:** stores the size, color mode, color text, and optional reference link in Firestore. Teacher dashboard, student dashboard, and My Requests show the new information. Historical requests remain readable.

## Apply in GitHub Codespaces

1. Upload `thunder-vikes-store-form-patch.zip` into your repository root (same folder as `package.json`).
2. In the Codespaces terminal run:

```bash
unzip -o thunder-vikes-store-form-patch.zip
rm thunder-vikes-store-form-patch.zip
npm run build
git add -A
git commit -m "Update product categories and CAD quote request form"
git push origin main
```

If you have not yet installed dependencies in this Codespace, run `npm install` before `npm run build`.

This patch does not include changes to Firebase security rules or Cloud Functions. A URL field is **not a file-upload service**: customers must paste a shareable link. Price-estimate outreach is a manual team process; no emails or texts are automatically sent by this change.
