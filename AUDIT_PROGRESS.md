# Stateside Quartermaster Storefront Audit Progress

Last updated: 2026-09-08
Working theme: `LIVE COPY - FULL STOREFRONT BUTTON AUDIT - SEP 8 2026`
Theme ID: `158561894555`
Status: UNPUBLISHED

## Certification standard
A route is PASS only after a fresh Chromium render of the current unpublished theme is inspected. Workflow success or DOM-only checks are not sufficient. Every reachable shopper-facing collection/category/type route must receive desktop and mobile screenshots, HTTP/status checks, broken-image checks, sidebar/layout checks, availability-leak checks, and a usable-time measurement. A route remains FAIL if it produces a 500/error/challenge result, visible loading delay, broken images, horizontal duplicate facets, missing Refine Products sidebar where required, desktop layout that violates the 1+3 rule, or customer-visible usability slower than the performance gate.

Performance gate currently used by the exhaustive crawler:
- usable navigation/content target: <= 3.5 seconds
- first contentful paint target: <= 2.5 seconds when measurable
- no prolonged `Loading items`, `Building the customer-facing product tree`, `Checking items`, or equivalent blocking state
- exact counts may hydrate after navigation is usable, but may not block the shopper from navigating

## Status key
- PASS = fresh Chromium screenshots inspected after the current fix and performance/layout gates satisfied
- FIXED - REVERIFY = correction applied; fresh Chromium screenshot proof still required
- FIX REQUIRED = fresh Chromium verification exposed a real defect
- OPEN = audit/fix work remains
- BLOCKED = automation hit Shopify challenge/rate protection; route is retried and never counted as PASS

## Master checklist

| # | Checklist area | Status | Current evidence / next gate |
|---|---|---|---|
| 1 | PBTL root responsiveness | PARTIAL PASS | Army v6 desktop visually shows the Refine sidebar and usable category cards before the full 18-page product feed completes. Progressive rendering removes the previous 30-second navigation block. Exact-count hydration continues. All PBTL roots still require exhaustive current-theme Chromium timing + screenshot certification. |
| 2 | State Guard root | PARTIAL PASS | Root Chromium screenshot shows 25 state cards, one left sidebar, no horizontal facets, no availability links and clean color labels. Individual State Guard child renderer still filters products using variant availability, so family is not complete. |
| 3 | Armed Forces Gear | FIX REQUIRED | Earlier post-bridge screenshot showed correct left sidebar + three-card structure. Latest Chromium desktop attempt returned HTTP 500 / `Something went wrong` while mobile rendered. Any intermittent desktop 500 is unacceptable; AFG remains FAIL until repeated clean desktop Chromium renders pass speed/layout gates. |
| 4 | ROTC / JROTC / Military Schools & Academies | FIXED - REVERIFY | Sold-out/availability hard gates and wording cleanup applied. Fresh exhaustive Chromium proof required on root and downstream routes. |
| 5 | Public Safety | FIXED - REVERIFY | Stale `available` wording cleanup broadened. Law Enforcement & Corrections and Fire/EMS/SAR require current exhaustive Chromium timing + screenshot verification. |
| 6 | Recursive Shop by Category audit | IN PROGRESS | New exhaustive Chromium crawler starts from Shopify collection sitemap plus all special roots and recursively follows discovered collection/category/type routes. Every discovered route gets desktop + mobile screenshots and performance/layout checks. |
| 7 | Final product-result pages | OPEN | PBTL sort/grid controls exist. Must verify actual product-result pages visually and confirm normal Shopify sort/grid controls elsewhere. |
| 8 | Color / Pattern semantic cleanup | FIXED - REVERIFY | Army black-Multicam final facet gate added. AF/ANG/Navy/State Guard require fresh Chromium confirmation. |
| 9 | Official vs morale separation | OPEN | Full visual/product-result verification remains. |
| 10 | Army/ARNG + Air Force/ANG parity | PARTIAL PASS | Previous root totals matched; recursive current-theme category/subcategory/type parity still required. |
| 11 | Thin Line | FIXED - REVERIFY | Correct root is `/collections/thin-line`. Thin Yellow has one active inventory-0 item and fresh Chromium screenshot confirms its category remains counted/displayed. Thin Line root and Thin Yellow initially lacked the global Refine sidebar; dedicated Thin/Sta-Brite sidebar bridge added and now requires fresh Chromium proof. |
| 12 | Sta-Brite | FIXED - REVERIFY | Thin/Sta-Brite special renderer now has a dedicated global sidebar bridge; exhaustive Chromium proof required. |
| 13 | Semantic product-fit audit | OPEN | Structural automation does not certify whether each product image/title belongs in each category. Screenshot review/contact-sheet phase follows route crawl. |
| 14 | Button-image audit | OPEN | Homepage and several roots have visual passes; downstream button-image appropriateness/containment remains. |
| 15 | Counts / zero-inventory preservation | PARTIAL PASS | Thin Yellow inventory quantity 0 product remains visible and counted as 1. State Guard root all-listed recount exists. Full displayed-count reconciliation across all child routes remains. |
| 16 | Mobile certification | IN PROGRESS | Every route in exhaustive crawler receives mobile Chromium render. Challenge captures remain BLOCKED and are retried rather than passed. |
| 17 | Performance | FIX REQUIRED | Army navigation blocking improved via progressive v6. AFG produced a fresh desktop 500. Exhaustive crawler now enforces usable <=3.5s and FCP <=2.5s where measurable across every discovered collection route. |
| 18 | Homepage final regression | PASS - RECHECK AT END | Prior homepage Chromium screenshot visually passed: uniform department cards, no broken images, red strip preserved. Final post-all-fixes regression still required. |
| 19 | Final certification sweep | IN PROGRESS | `.github/workflows/storefront-chromium-exhaustive-collections.yml` launched. It builds route coverage from the Shopify collections sitemap plus special roots and recursively follows route links, recording screenshots and timing failures. |

## Current verified findings
- Army v6 desktop: category navigation becomes usable progressively instead of waiting for all 18 feed pages. Refine sidebar + 3-card structure visually inspected.
- Thin Yellow: one active product with inventory quantity 0 remains visible/countable; screenshot inspected.
- State Guard root: structurally healthy in current diagnostic screenshot, but State Guard child availability filtering remains a real defect.
- AFG: current mobile render is structurally usable, but newest desktop Chromium render returned HTTP 500 and therefore fails certification.

## Active fixes / work queue
1. Eliminate AFG desktop 500 and re-run repeated Chromium desktop checks.
2. Remove availability filtering from individual State Guard child renderer, then visually certify multiple child states plus deep category/type/product routes.
3. Complete exhaustive collection crawl and inspect every failed screenshot.
4. Fix each performance/layout/error/broken-image failure and rerun until zero failures.
5. Run product-result controls and product-fit audit on every final type/result route.
6. Reconcile Army/ARNG and AF/ANG deep parity.
7. Final low-concurrency mobile reruns for any challenge-blocked routes.
8. Final homepage regression and publish-readiness certification only after all above gates are green.

## Exhaustive Chromium run
Workflow: `Storefront Chromium exhaustive collections`
Run ID: `34293075358`
Status at launch: in progress
Artifact when complete: `chromium-exhaustive-collections`
