/**
 * lib/config.ts — Centralised magic constants
 *
 * Plain module: no "use client", no imports. Safe to import from both
 * server (Route Handlers, Server Actions) and client components.
 *
 * RULE: values are PRESERVED exactly as-is from their source locations.
 * Different call-sites that happened to share the same number get SEPARATE
 * named constants when their semantic concern differs.
 */

// ---------------------------------------------------------------------------
// Upload size limits (bytes)
// ---------------------------------------------------------------------------

/** 2 MB hard limit — generic image uploads (public bucket via /api/upload) */
export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

/** 5 MB hard limit — payment-slip uploads in booking flow */
export const BOOKING_SLIP_MAX_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Pagination page sizes
// ---------------------------------------------------------------------------

/** Rows per page on admin lists: /admin/products and /admin/shops */
export const ADMIN_PAGE_SIZE = 20;

/**
 * Rows per page on seller product list: /sell/products.
 * Same numeric value as ADMIN_PAGE_SIZE (20) but kept separate because the
 * seller-facing list is a different concern and may diverge independently.
 */
export const SELL_PRODUCTS_PAGE_SIZE = 20;

/** Rows per page on seller staff list: /sell/staff */
export const STAFF_PAGE_SIZE = 10;
