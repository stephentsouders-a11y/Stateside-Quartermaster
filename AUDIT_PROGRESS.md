# Stateside Quartermaster Storefront Audit Progress

Last updated: 2026-09-08
Working theme: `LIVE COPY - FULL STOREFRONT BUTTON AUDIT - SEP 8 2026`
Theme ID: `158561894555`
Status: UNPUBLISHED

## Status key
- PASS = fresh rendered verification completed after current fix
- FIXED - REVERIFY = code/theme change applied; fresh rendered verification still required
- FIX REQUIRED = fresh rendered verification exposed a real defect; correction is in progress or just applied
- OPEN = audit/fix work remains
- BLOCKED = verification blocked by Shopify challenge/rate protection; not treated as a storefront failure

## Master checklist

| # | Checklist area | Status | Current evidence / next gate |
|---|---|---|---|
| 1 | PBTL root rerender after precedence fix | FIX REQUIRED | Fresh Army desktop render after the all-listed precedence fix removed `available items`, removed availability URLs, retained one sidebar, and showed no bad color labels or broken images. However the tree was still only `Loading items... 7/18` after 30 seconds. PBTL renderer v4 now raises feed workers from 4 to 8; fresh rerender underway. ARNG/AF/ANG/Navy plus Marines/Coast Guard/Space Force require the same current-theme verification. |
| 2 | State Guard certification | FIXED - REVERIFY | Left sidebar + 3-card grid previously visually passed. New hard gate now strips availability links and recounts each state from all listed products except `OPTIONS_HIDDEN_PRODUCT`, regardless of stock. Color cleanup remains subject to fresh render. |
| 3 | Armed Forces Gear | FIXED - REVERIFY | Vendor-only universe confirmed previously. Sidebar bridge is in place; fresh current-theme 1+3 visual verification remains. |
| 4 | ROTC / JROTC / Military Schools & Academies | FIXED - REVERIFY | Program-tree availability parameters removed. Sold-out hard gate now restores academy cards if legacy availability logic removes them and strips availability links. Fresh ROTC/JROTC/MSA renders pending. |
| 5 | Public Safety | OPEN | Law Enforcement & Corrections and Fire/EMS/SAR need final current-theme all-listed wording, layout, mobile and product-fit certification. Included in v5 sweep. |
| 6 | Recursive Shop by Category audit | OPEN | Root-level sample audit completed; full Category -> Subcategory -> Type -> Products BFS remains. |
| 7 | Final product-result pages | OPEN | Custom PBTL sort/grid controls added. Must verify at actual product-result level and confirm native controls elsewhere. |
| 8 | Color / Pattern semantic cleanup | FIXED - REVERIFY | Metadata/material noise cleaner added. Fresh Army render had `badColorLabels: []`. Air/ANG/Navy and State Guard need equivalent post-hardening confirmation. |
| 9 | Official vs morale separation | OPEN | Architecture exists; full branch-by-branch product-result verification remains. |
| 10 | Army/ARNG + Air Force/ANG parity | PARTIAL PASS | Previous root totals matched: Army/ARNG 3,879 each; Air Force/ANG 1,786 each. Category/subcategory/type parity still needs current all-listed comparison. |
| 11 | Special collections | OPEN | Thin Line and Sta-Brite are now included in the v5 critical sweep. Recursive checks remain for Watches, Flashlights, K9, Literature, Child Safety, Morale/Tactical ID, Flags, Uniforms, Tactical, Armor, First Aid, Outdoor, Footwear, Accessories, etc. |
| 12 | Semantic product-fit audit | OPEN | Root structure audits do not certify product membership. Final product image/title fit review remains one of the largest work items. |
| 13 | Button-image audit | OPEN | Homepage and several roots pass visually. Full downstream image appropriateness/containment audit remains. |
| 14 | Counts | OPEN | Global all-listed architecture in place. State Guard all-listed count gate added. Full displayed-count reconciliation across child routes remains. |
| 15 | Mobile certification | OPEN | Latest fresh Army mobile render was Shopify `Just a moment...` challenge-blocked, so it was not treated as a storefront failure or pass. Full low-concurrency mobile sweep remains. |
| 16 | Performance | FIX REQUIRED | Apparel 500 fixed. Fresh Army still loaded only 7/18 feed pages at 30 seconds. PBTL v4 concurrency increase applied and is being measured by a fresh render. |
| 17 | Homepage final regression | PASS | 29 department cards rendered cleanly; no broken images; bottom red strip preserved; no availability-filter leakage in verified render. A final post-all-fixes regression will still run before publish certification. |
| 18 | Final certification sweep | OPEN | New `Storefront audit - certification v5` workflow performs a single low-concurrency current-theme sweep across Army, ARNG, AF, ANG, Navy, Marines, Coast Guard, Space Force, State Guard, AFG, ROTC, JROTC, MSA, Law, Fire/EMS/SAR, Thin Line and Sta-Brite, recording load state/timing plus desktop/mobile screenshots. |

## Verified structural passes so far
- Homepage root
- Accessories & Gifts root
- Apparel root after 500 fix
- Tactical root
- Army PBTL root: structural sidebar clean on fresh desktop, but NOT certified because the tree remained loading at 30 seconds
- Army National Guard root: prior structural geometry pass; current-theme recheck pending
- Air Force PBTL root: prior structural geometry pass; current-theme recheck pending
- Air National Guard root: prior structural geometry pass; current-theme recheck pending
- Navy PBTL root: prior desktop/mobile geometry pass; current-theme recheck pending
- State Guard root: left Refine sidebar + 3-card desktop grid previously visually inspected; post-count/color hard-gate recheck pending

## Fixes applied in current batch
1. `sq-sold-out-preservation-hard-gate` added to the unpublished theme. It strips `filter.v.availability`, protects MSA cards from stock-based removal, and enforces all-listed State Guard root counts.
2. `sq-air-force-recovery-all-listed-gate` added. Air Force recovery groups now retain sold-out recovery products and can create their recovery type button from a listed product even if no variant is currently available.
3. Fresh Army render proved the old `available items` wording is gone and visible bad Army color labels are gone, but exposed a real performance failure (`7/18` feed pages at 30 seconds).
4. `sq-bfl-unified-series-tree-audit-wrapper-v4` added and wired into both the early military root section and global normalizer, increasing product-feed concurrency from 4 to 8 workers while preserving all-listed/facet/sort behavior.
5. New low-concurrency comprehensive workflow `.github/workflows/storefront-audit-cert-v5.yml` created to sweep all critical families from the current unpublished theme.

## Known active defects / debt
1. Heavy PBTL roots still require proof that v4 completes promptly. Until that fresh render passes, Army/PBTL performance is a known defect, not a certification pass.
2. Air Force/ANG/Navy older facet renders exposed `Multicam Black` / `Black Multicam`; post-v4/hardening rerender is required.
3. Some legacy source sections still contain availability parameters or availability-based scripts. The current shopper-facing hard gate neutralizes these, but source cleanup remains technical debt until the recursive audit is complete.
4. Product-level semantic fit and recursive downstream audit remain incomplete.
5. Mobile can trigger Shopify anti-bot challenge during automation; blocked captures are not counted as passes or storefront failures and are retried separately at low concurrency.

## Current batch
Batch 1 targets:
- Prove the v4 PBTL loader completes heavy roots promptly.
- Reverify all military PBTL roots on the current unpublished theme.
- Reverify State Guard all-listed counts + cleaned color sidebar.
- Verify AFG 1+3 layout after sidebar bridge.
- Verify ROTC/JROTC/MSA sold-out preservation.
- Finish Law Enforcement & Corrections and Fire/EMS/SAR root certification.
- Verify Thin Line sold-out preservation and Sta-Brite.
- Verify PBTL product-result sort/grid controls before starting the full recursive BFS/product-fit pass.
