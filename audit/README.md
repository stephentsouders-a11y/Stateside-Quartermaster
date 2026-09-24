# Sidebar routing repair audit

Shopify draft theme: `SIDEBAR TREE CHROMIUM REPAIR - SEP 23 2026` (`159040962715`).

This branch mirrors the draft-only sidebar routing repair and carries the Chromium/Playwright regression audit.

Audit requirements:
- 42 collection roots
- desktop 1440x1000
- mobile 390x844
- no residual sidebar links using `filter.p.product_type`
- focused Air Force Badge Bundles route resolves to `/collections/sta-brite-air-force/sq-type-air-force-badge-bundles`
- Badge Bundles result contains 7 expected products
- Air Force Cap Devices and Beret Flashes resolve to their `SQ Type:` tag routes
- videos, screenshots, JSON report, and Markdown summary uploaded as GitHub Actions artifacts

The live Shopify theme is not modified by this branch.
