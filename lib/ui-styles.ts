import type { CSSProperties } from "react";

/**
 * Canonical form-input style shared across AddressManager and CheckoutForm.
 * radius 8 · fontSize 15 · padding "10px 12px" · bg var(--bg) · color var(--ink)
 *
 * DO NOT add other variants here — any style that differs even slightly from
 * this definition must stay local to its file. See Layer 3 refactor notes.
 */
export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 15,
  fontFamily: "inherit",
  background: "var(--bg)",
  color: "var(--ink)",
  boxSizing: "border-box",
};
