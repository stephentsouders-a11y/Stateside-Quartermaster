# Sta-Brite flashing repair — 2026-09-11

## Status

Source repairs are committed and saved to unpublished Shopify theme 158561894555. The live theme was not modified or published. Final post-repair Chromium verification is pending because GitHub Actions run 34639186501 is queued without an assigned runner. This report does not certify the full task as complete.

Storefront route: https://www.statesideqm.com/collections/sta-brite-insignia
Draft preview: https://www.statesideqm.com/collections/sta-brite-insignia?preview_theme_id=158561894555
Repository: stephentsouders-a11y/Stateside-Quartermaster
Branch: refine-restart-v3

## Source repairs

1. Commit 8b8ea312a83b3932f08c4beb1eb4bb56a95e69fe updated sections/sq-thin-stabrite-subcategories.liquid. The old Sta-Brite button section is hidden before its markup paints, and competing legacy sidebar, parent-isolation, and root-order renderers are disabled on this route. Hidden structural links remain available to the V3 sidebar, preserving the twelve original branch/program destinations and their order.
2. Commit af25ed7095d154218a105d7b4985613f0a969df0 updated snippets/sq-refine-v3-child-route-isolation.liquid. It disables three legacy type-routing/product-renderer entrypoints on the Sta-Brite root and V3 child routes whose sq_root is sta-brite-insignia. This addresses the native filter.p.product_type to sq_type_family redirect loop discovered during browser testing.

No products, prices, inventory, or collection memberships were changed.

## Evidence already collected

Baseline Chromium recordings showed old branch buttons and repeated product-layout blanking. The desktop baseline recorded 9,643 MainContent DOM mutations; the mobile baseline recorded 11,616 over the diagnostic observation periods.

Initial repaired Chromium run: 34638432118
Artifact: 10279560732, sta-brite-repaired-chromium-cert

The initial desktop cold load recorded 692 sampled frames with zero old-button visibility failures. There was one V3 layout, one visible product grid, 50 product cards, three desktop columns, no duplicate product cards, no horizontal overflow, and no broken product images at capture. All four sidebar disclosure controls toggled successfully. Reload did not flash the old buttons. The 100, 250, and 50 products-per-page controls each produced the exact requested card count. Only three MainContent mutations occurred in the late observation window after eight seconds.

The initial run was not a passing certification: its hierarchy assertion used innerText while the disclosure was closed, and its type-filter click exposed a real repeated redirect loop. Subsequent requests encountered a connection-verification page and HTTP 429, preventing mobile completion. The hierarchy assertion now uses textContent; the redirect loop has been patched separately. Those failures are not concealed or reclassified as a pass.

The first patch passed Shopify Liquid parsing, section JSON-schema parsing, inline JavaScript parsing, and Shopify Theme Check with zero offenses. The second patch passed local JavaScript syntax and seven guard-scope regression cases. These local cases are not substitutes for a completed browser retest.

## Final browser retest

Workflow: .github/workflows/sta-brite-final-verified.yml
Workflow commit: 36ed5bd2e19ea7c06291614aa5deab33c1899b32
Run: https://github.com/stephentsouders-a11y/Stateside-Quartermaster/actions/runs/34639186501
Job: 103394419868
Expected artifact name: sta-brite-final-verified

The retest validates both edited Liquid files and their JavaScript, runs mobile before desktop, records cold loads and reloads, checks branch labels/destinations, product-page sizes, type and availability filtering, and Army branch navigation. It records screenshots, video, frame visibility, and main-frame navigations. A navigation-loop guard closes the page if excessive redirects recur. A separate agent-browser pass and video filmstrips are included.

Pending work: inspect the completed retest results and visual artifacts; address any genuine remaining failures before declaring draft verification complete. Publication/live verification is separate and remains outstanding. The Shopify connection permits unpublished-theme edits but prohibits live-theme writes and publishing.

## Deployment readback

Theme role confirmed: UNPUBLISHED.

- sections/sq-thin-stabrite-subcategories.liquid MD5: fb34eb51ecdcea413b3a690f4eb54e2d. This includes a concurrent Thin Line-only addition that preserves the Sta-Brite repair.
- snippets/sq-refine-v3-child-route-isolation.liquid MD5: 689556cf5374abdd0310902dfe2cdf75.

The assistant has not published theme 158561894555 or modified live theme 158560583835.
