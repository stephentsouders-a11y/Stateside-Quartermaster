# Stateside Quartermaster Storefront Audit Progress

Last updated: 2026-09-08
Working theme: `LIVE COPY - FULL STOREFRONT BUTTON AUDIT - SEP 8 2026`
Theme ID: `158561894555`
Status: UNPUBLISHED

## Status key
- PASS = fresh rendered verification completed after current fix
- FIXED - REVERIFY = code/theme change applied; fresh rendered verification still required
- OPEN = audit/fix work remains
- BLOCKED = verification blocked by Shopify challenge/rate protection; not treated as a storefront failure

## Master checklist

| # | Checklist area | Status | Current evidence / next gate |
|---|---|---|---|
| 1 | PBTL root rerender after precedence fix | FIXED - REVERIFY | Audited renderer moved into early collection section. Navy already rendered without `available items`; Army/ARNG/Air Force/ANG need fresh post-change rerender. Marines/Coast Guard/Space Force still open. |
| 2 | State Guard certification | FIXED - REVERIFY | Left sidebar + 3-card grid previously visually passed. Color cleanup and all-listed source count cleanup still being finalized and rerendered. |
| 3 | Armed Forces Gear | FIXED - REVERIFY | Vendor-only universe confirmed previously. Sidebar bridge added; fresh 1+3 visual verification pending. |
| 4 | ROTC / JROTC / Military Schools & Academies | FIXED - REVERIFY | Program-tree availability parameters removed. Remaining legacy availability-only academy cleanup is being removed/neutralized; post-fix renders pending. |
| 5 | Public Safety | OPEN | Law Enforcement & Corrections and Fire/EMS/SAR need final all-listed wording + desktop/mobile rerender + product-fit audit. |
| 6 | Recursive Shop by Category audit | OPEN | Root-level sample audit completed; full Category -> Subcategory -> Type -> Products BFS remains. |
| 7 | Final product-result pages | OPEN | Custom PBTL sort/grid controls added. Must verify at actual product-result level and confirm native controls elsewhere. |
| 8 | Color / Pattern semantic cleanup | FIXED - REVERIFY | Metadata/material noise cleaner added. Army bad Black OCP/Multicam Black removed; Air/ANG/Navy still showed Multicam Black in an older render and require post-hardening rerender. |
| 9 | Official vs morale separation | OPEN | Architecture exists; full branch-by-branch product result verification remains. |
| 10 | Army/ARNG + Air Force/ANG parity | PARTIAL PASS | Army/ARNG previously both loaded 3,879 items; Air Force/ANG both 1,786 items. Need category/subcategory/type parity comparison, not only root totals. |
| 11 | Special collections | OPEN | Homepage roots rendered; recursive checks remain for Thin Line, Sta-Brite, Watches, Flashlights, K9, Literature, Child Safety, Morale/Tactical ID, Flags, Uniforms, Tactical, Armor, First Aid, Outdoor, Footwear, Accessories, etc. |
| 12 | Semantic product-fit audit | OPEN | Root structure audits do not certify product membership. Final product image/title fit review remains one of the largest work items. |
| 13 | Button-image audit | OPEN | Homepage and several roots pass visually. Full downstream image appropriateness/containment audit remains. |
| 14 | Counts | OPEN | Global all-listed architecture in place; full displayed-count reconciliation across child routes remains. |
| 15 | Mobile certification | OPEN | Army/ARNG/Navy representative mobile renders passed; Air/ANG were challenge-blocked in one run. Full family/mobile sweep remains. |
| 16 | Performance | OPEN | Apparel 500 fixed and PBTL legacy render stack reduced. Need cold-load checks across heavy roots and final routes. |
| 17 | Homepage final regression | PASS | 29 department cards rendered cleanly; no broken images; bottom red strip preserved; no availability-filter leakage in verified render. Final post-all-fixes regression still required before publish certification. |
| 18 | Final certification sweep | OPEN | Zero-dead-link / zero-error / zero-duplicate-facet / zero-known-sold-out-exclusion / desktop+mobile final gate remains. |

## Verified structural passes so far
- Homepage root
- Accessories & Gifts root
- Apparel root after 500 fix
- Tactical root
- Army PBTL root: desktop geometry; mobile render available
- Army National Guard root: desktop geometry; mobile render available
- Air Force PBTL root: desktop geometry
- Air National Guard root: desktop geometry
- Navy PBTL root: desktop + mobile geometry
- State Guard root: left Refine sidebar + 3-card desktop grid previously visually inspected

## Known active defects / debt
1. Some older PBTL renders still displayed `available items`; audited renderer precedence was changed and requires fresh rerender.
2. Air Force/ANG/Navy older facet renders still exposed `Multicam Black` / `Black Multicam`; global semantic hardening is being strengthened and rerendered.
3. State Guard source still contained availability-filtered links and availability-only count code; source-level cleanup is in progress even though the runtime bridge already corrected shopper-facing behavior.
4. Military Schools legacy script can remove a category if all variants are sold out; this violates the all-listed rule and is being neutralized.
5. Product-level semantic fit and recursive downstream audit remain incomplete.

## Current batch
Batch 1 targets:
- Reverify all military PBTL roots after audited-renderer precedence fix.
- Finish State Guard source-level sold-out preservation and color cleanup.
- Verify AFG 1+3 layout after sidebar bridge.
- Remove remaining ROTC/JROTC/MSA availability-only source behavior.
- Finish Law Enforcement & Corrections and Fire/EMS/SAR root certification.
- Verify PBTL product-result sort/grid controls.
