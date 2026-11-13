# Thunder Vikes Store: Shop / Request / Merch + Payment Prompt Removal

## What changes
- Navigation: Shop, Request, Merch are public; Workbench and Manage require approved staff access; Orders stays available for signed-in purchase history.
- Shop lists 3D-print and woodwork listings only. Merch lists T-Shirts, Hats, Hoodies, and Other Merch.
- Admins/class-student staff can add Merch products using the existing Add Product form by selecting a clothing category. Fields include available sizes, colors, material, and estimated availability.
- Guests can request Merch or Shop estimates without signing in. Merch size is verified on the Netlify server before an order is recorded.
- Staff can view and edit apparel sizes in order management; signed-in customers see their chosen size in purchase history.
- Removes the payment-instructions checkbox by providing the updated listing editor without that field. Removes the customer-facing deposit instructions prompt and the unused admin suggested-deposit screen. Historical deposit data in Firestore is not deleted.

## Install in GitHub Codespaces
1. Upload this ZIP at the repository root where package.json lives.
2. Run: `unzip -o thunder-vikes-merch-navigation-patch.zip`
3. Run: `rm thunder-vikes-merch-navigation-patch.zip`
4. Run: `npm install` (only if you need to install dependencies)
5. Run: `npm run build`
6. Push after it builds:
   `git add -A && git commit -m "Add Merch section and remove deposit prompts" && git push origin main`

## Firestore Rules
The patch includes an updated `firestore.rules` with `selectedSize` allowed in staff order edits.
**This file does NOT automatically deploy to Firebase just because you push to GitHub.**
Compare your current Firebase Console -> Firestore Database -> Rules with the file, and publish the updated rules after reconciling any local rule edits. If all your other rules are already in place, the only functional rule edit needed here is to add `'selectedSize'` to the `orders/{orderId}` allow-update affectedKeys allowlist.

## Netlify
Your existing guest order Netlify Function (submit-shop-estimate.cjs) is updated to validate sizes and include them in Firestore and email notifications. Deploy through Netlify as usual. Ensure `FIREBASE_SERVICE_ACCOUNT_JSON` is already configured for guest orders. Email notifications require the pre-existing Resend settings. No extra payment service or Firebase Blaze upgrade is required for these edits.

## Notes
- The original code snapshot did not contain a separate checkbox with the exact text “Show payment instructions after inquiry submission ($2.00 suggested deposit)”. Replacing the listing editor removes any such checkbox on that screen, and active deposit prompts have also been removed. If you have unpublished newer code that added this option elsewhere, compare before applying this patch.
- The same `listings` and `orders` Firestore collections are used; no data migration or new collection required.
- Current category names for Merch: T-Shirts, Hats, Hoodies, Other Merch. Products with legacy category `Merch` also show under the All filter.
- Netlify build and live network submissions could not be tested here. Source TypeScript/JSX syntax and Netlify function syntax were checked, plus local category-routing and code-coverage assertions.
