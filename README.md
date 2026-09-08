# Stateside Quartermaster Shopify Theme

Source checkpoint: Shopify unpublished theme `LIVE EXACT COPY - SEP 8 2026 - AUDIT`.

## Homepage Shop by Category parity

The homepage **Shop by Category** cards are restyled to match the established **Products Built for the Line** button system while preserving category links, ordering, collection counts, and existing images.

Primary changed file:

- `assets/sq-home-canonical.css`

Patch-only reference:

- `SHOP_BY_CATEGORY_PBTL_PARITY_PATCH.css`

This change is intentionally scoped to `.sqhc-grid .sqhc-card` and related descendants. It does not rewrite the Products Built for the Line section and does not alter collection routing logic.

Final storefront visual QA should be performed on the unpublished Shopify theme before publishing.