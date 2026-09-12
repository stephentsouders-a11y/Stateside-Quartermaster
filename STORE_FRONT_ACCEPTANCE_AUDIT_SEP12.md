# Stateside Quartermaster - September 12, 2026 Storefront Acceptance Audit

## Certification rule
A feature is PASS only after current live-store Chromium verification. A code change, successful deploy, prior screenshot, or prior workflow is not proof by itself. Any failure is fixed in GitHub and then re-tested in Chromium.

## 1. Homepage regression
- No unintended duplicate or legacy homepage buttons.
- Law Enforcement / Corrections and Firefighting / EMS / SAR must not reappear as old-design duplicate homepage buttons.
- Where public-safety cards are intentionally present in Products Built for the Line, only the current design/placement is allowed; no legacy copies.
- Homepage button ordering, sizing, images, count bars, and bottom red/blue strip remain intact.
- Every homepage button opens its intended destination.

## 2. Products Built for the Line series
- Every PBTL series page has a clearly visible correct series/page title, including Army, Army National Guard, Air Force, Air National Guard, Navy, Marines, Coast Guard, Space Force, State Guard, ROTC, JROTC, and Military Schools & Academies.
- No PBTL title may be missing, blank, hidden, or replaced by generic text.
- Shop All appears first where required; then Shop by Category, Shop by Type, then products.
- Army/ARNG product/category parity is preserved where required.
- Air Force/ANG product/category parity is preserved where required.
- Official uniform tabs/patches remain separated from morale patches.
- No incorrect service/color tactical products leak into the wrong PBTL series.

## 3. Button/page navigation design
- Concept One pagination/button design is used where requested.
- Page-number controls remain visible at the bottom with Previous/Next arrows.
- Pagination stays correctly linked to Products Per Page controls; changing one does not break the other.
- Every page-number, Previous, Next, card, and navigation button is click-tested in Chromium.
- No click may dead-end, remain on the wrong state, navigate to a wrong collection, or produce an error page.
- Video evidence is retained for Chromium click paths.

## 4. Refine Products sidebar behavior
- Exactly one Refine Products sidebar is present on pages that require one.
- No duplicate Refine Products bars/sidebars.
- State Guard root is an explicit exception: no Refine Products sidebar on the State Guard landing page.
- Only the checkbox square activates a Refine option; the text label itself is not a link/click target.
- Every visible checkbox is individually clicked and the resulting product set is inspected.
- Refine selection text, destination/state, product count behavior, and clear/reset behavior must remain coherent.
- No horizontal duplicate facet system may appear in addition to the sidebar.

## 5. Category naming and hierarchy
- Under each homepage destination, Shop by Category reproduces the exact names and corresponding destinations of the old child buttons that belonged to that homepage button.
- Do not substitute sitewide navigation names, unrelated PBTL series names, or generic categories.
- Preserve the page-specific Category -> Subcategory -> Type hierarchy when converting old buttons to Refine Products checkboxes.
- Each category/filter must return products matching that category.

## 6. State Guard
- State Guard landing page uses the requested four-column/grid presentation and fills the available content width cleanly.
- State Guard Themed Merchandise is present and placed at the top as requested.
- State Guard root has no Refine Products sidebar.
- Individual State Guard component/state pages use the adapted Refine Products sidebar.
- State Guard Themed Merchandise destination also receives the appropriate Refine system where required.
- Root and child pages must not sit in a perpetual spinner/loading state.
- State seals/logos remain centered, uncropped, and visually consistent.

## 7. Known spinner/freeze regression pages
- Armed Forces Gear must load repeatedly without prolonged spinning/freezing or intermittent 500/error pages.
- State Guard root and child pages must load without indefinite loading.
- Accessories / Gifts / Collectibles must load with one sidebar only and no duplicated filter system.
- Any route showing Loading items, Building the customer-facing product tree, Checking items, Organizing products, or similar blocking state beyond the usability gate fails.

## 8. Refine Products collection-by-collection audit
Every visible Refine option must be individually tested on at least these recently requested roots: K9/Dog Gear; Knives/Axes/Cutlery; Uniforms; Tactical Gear; Watches; Sta-Brite Insignia; Outdoor/Preparedness Gear; Morale Patches/Tactical ID; Zippos/Lighters/Torches; Child Safety Shop; Patriotic/American Heritage; Flashlights/Lighting; Thin Line; Airsoft/Milsim; Safety/Rescue/Climbing; Footwear/Gloves/Eyewear; First Aid/Medical/IFAK; Flags/Patriotic Decor; Dive/Scuba; Firearm Accessories; Literature; Body Armor/Ballistic Protection; Accessories/Gifts/Collectibles; Armed Forces Gear; and all PBTL/State Guard roots and descendants.

## 9. Semantic product-fit audit
- A filter does not pass merely because it returns products. The returned products must belong there.
- Flag and correct obvious category leakage, e.g. belts under Chest Rigs, chest rigs/plate carriers under Belts, apparel under helmets, non-medical items under First Aid/IFAK, non-lighting items under Flashlights/Lighting, non-footwear under Boots/Footwear, and unrelated items under patches/insignia.
- Review product title and visible product image together when ambiguity remains.
- Misplaced products are moved to the correct category/filter and removed from the incorrect one, then the original and corrected destinations are re-tested.
- Product-fit findings are treated as real failures, not warnings.

## 10. Product result integrity
- Product cards must correspond to the active checkbox/category/type selection.
- No unrelated products should appear because of broad vendor tags, stale handles, generic keywords, or collection leakage.
- Sold-out/zero-inventory products that are intentionally part of a collection remain represented/countable unless a specific rule says otherwise; do not silently hard-filter by availability.
- Counts must match what the shopper can actually reach.
- Product-result sorting/grid/pagination controls remain functional.

## 11. Visual/layout quality
- Desktop sidebar + content layout is stable; where the 1+3 layout applies, the sidebar occupies one column and three cards align beside it.
- No horizontal overflow.
- No broken images.
- Button/card images remain centered, contained, uncropped, and visually consistent with the established white-background/count-bar rules.
- Mobile layout is usable and does not overlap, duplicate, hide, or strand controls.
- Footer must not overlap products or navigation.

## 12. Performance/error gates
- HTTP status must be successful; no Shopify error/challenge page counts as PASS.
- Usable navigation/content target: <= 3.5 seconds.
- First contentful paint target when measurable: <= 2.5 seconds.
- No prolonged blocking spinner/loading text.
- Repeat known-problem routes more than once to catch intermittent failures.

## 13. Chromium evidence required
For each audited route/control, retain enough evidence to reproduce the result: route, control label, intended destination/state, actual destination/state, PASS/FAIL, error if any, screenshot, and Chromium video for click-path audits. Failed routes are fixed in GitHub and re-run until clean.

## Final certification
The storefront is not certified until: zero broken button/navigation failures; zero duplicate Refine sidebars; zero missing PBTL series titles; every Refine checkbox has been exercised; obvious semantic product-placement failures have been corrected; spinner/error regressions are cleared; desktop and mobile regressions pass; and a final homepage regression confirms no repaired area reintroduced an earlier defect.
