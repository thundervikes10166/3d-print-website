# Thunder Vikes Store: Product Listings, Stock, and Size Options

This ZIP updates the *React/Vite* Thunder Vikes ordering site. It contains the new product-listing changes plus the previous Merch-navigation/admin-invitation changes. Extract it into the **store repository root**, not the separate Astro team website.

## New listing editor

Go to **Workbench → Add Product** or edit an existing product from **Manage**. The editor now has three simpler sections:

1. **Product information:** Item name, category, description, main product image URL and optional second image URL.
2. **Customer choices:** Filament, wood, or fabric; available colors; apparel sizes; and optional extra choices such as `With keyring, Without keyring`. For 3D prints and woodwork, click **Add size** as many times as needed, entering size name, physical dimensions, and an optional price specific to that size. Size entries are not required for single-size products.
3. **Availability and pricing:** Estimated turnaround, estimate-on-request or fixed starting fee, and an optional **Track limited quantity** checkbox. If tracking is on, enter an integer 0 or higher.

Example: If you enter **6** remaining, product cards and details show **6 left in stock** in red. Zero displays **Out of stock** and disables the inquiry form. If you leave stock tracking off, the item is treated as made-to-order and has no limited-quantity badge.

The old print-hours, layer-height, infill and filament-grams fields have been removed from the listing form; previously saved internal values are retained.

## Inquiry form

Customers do not need an account. Each item detail page displays its name, description, stock, colors, size/dimensions (when configured), other options (when configured), quantity, and these contact fields: first name, last name, email, phone and preferred contact method. Customers must give at least **one** contact method, then select Email or Phone as their preference. Additional notes are optional. Selected options are saved on the shop order and visible to staff; size and extra options are also included in the admin notification email.

A customer can request at most **15 units per inquiry**, or fewer if stock is lower. The Netlify Function checks the published listing and validates stock, colors, sizes, and options on the server before saving the request. It never trusts customer-supplied price data.

**Inventory is intentionally manual:** These are unconfirmed **estimate requests**, not completed purchases. Submitting a request does **not** reserve or decrement stock. Staff should adjust `Quantity remaining` when an order is confirmed or stock is replenished. Multiple simultaneous inquiries are possible, so stock badges are indicative, not a reservation guarantee.

## Install in GitHub Codespaces

Before overwriting, commit any changes you want to keep. Then upload this ZIP to the **root** of the ordering-store repository and run:

```bash
unzip -o thunder-vikes-listings-stock-options-patch.zip
rm thunder-vikes-listings-stock-options-patch.zip
npm install
npm run build
```

If the build succeeds:

```bash
git add -A
git commit -m "Improve product listings with stock and size options"
git push origin main
```

Confirm the new commit is **Published** in Netlify, then verify a test listing using a private/incognito browser window.

## Firebase security rules

`firestore.rules` is included because staff order editing now supports `selectedOption`. Open **Firebase Console → Firestore Database → Rules**, compare this file with your deployed rules (keep any later changes you've made), and publish the combined rules. Guest order submission continues to use the existing Netlify Function and requires `FIREBASE_SERVICE_ACCOUNT_JSON` in Netlify.

No Firebase Blaze upgrade or credit card is required for these listing changes.

## Limitations / notes

- Images for catalog listings are still **public image URLs**, not direct uploads. The separate custom CAD image upload feature is unaffected.
- Stock is tracked **per product**, not separately by color or size.
- Availability, production times, and estimated prices are not guaranteed until your team confirms the request.
- This patch passed TS/TSX syntax checks, server-side validation tests and CommonJS syntax checks. A full production build could not be run here because the environment's dependencies are incomplete. Run `npm install && npm run build` in your Codespace before deploying.
