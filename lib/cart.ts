"use client";

import { useSyncExternalStore } from "react";

const CART_KEY = "doprent.cart.v1";

export type CartItem = {
  id: string; // `${productId}:${variantId ?? ""}:${startDate}:${endDate}`
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  shopId: string;
  shopName: string;
  variantId: string | null;
  size: string | null;
  pricePerDay: number;
  deposit: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  /** Outbound shipping leg (shop→customer): "express" | "standard". */
  outboundMethod?: "express" | "standard";
  /** Return shipping leg (customer→shop): "express" | "standard". */
  returnMethod?: "express" | "standard";
  qty: number;
};

export type CartGroup = {
  key: string; // `${shopId}|${startDate}|${endDate}`
  shopId: string;
  shopName: string;
  startDate: string;
  endDate: string;
  items: CartItem[];
  /** Estimated rental subtotal (server re-prices; display only). */
  estimatedRental: number;
  estimatedDeposit: number;
};

/* ── internal store ─────────────────────────────────────────────── */

type Listener = () => void;
const listeners = new Set<Listener>();

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

/** Shared stable empty array — getServerSnapshot/getSnapshot must return a
 *  referentially stable value or useSyncExternalStore loops infinitely. */
const EMPTY_ITEMS: CartItem[] = [];

let _items: CartItem[] = EMPTY_ITEMS; // server starts empty; hydrated on first client subscribe
let _hydrated = false;

/** Hydrate from localStorage exactly once on the client. */
function ensureHydrated(): void {
  if (_hydrated || typeof window === "undefined") return;
  _hydrated = true;
  _items = readStorage();
}

function notify(): void {
  for (const l of listeners) l();
}

function subscribe(cb: Listener): () => void {
  // Hydrate before the first listener so the post-subscribe snapshot is stable.
  ensureHydrated();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_KEY) {
      _items = readStorage();
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Returns the current snapshot. MUST be pure / referentially stable — `_items`
 * only changes identity on an actual mutation, never on a plain read.
 */
function getSnapshot(): CartItem[] {
  return _items;
}

/** Called once per subscriber on the client to hydrate from localStorage. */
function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS; // no localStorage on server; stable ref avoids render loop
}

/* ── mutations ──────────────────────────────────────────────────── */

function add(item: Omit<CartItem, "qty"> & { qty?: number }): void {
  const next = [..._items];
  const qty = item.qty ?? 1;
  const idx = next.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    next[idx] = { ...next[idx], qty: next[idx].qty + qty };
  } else {
    next.push({ ...item, qty });
  }
  _items = next;
  writeStorage(_items);
  notify();
}

function remove(id: string): void {
  _items = _items.filter((i) => i.id !== id);
  writeStorage(_items);
  notify();
}

function setQty(id: string, qty: number): void {
  if (qty <= 0) {
    remove(id);
    return;
  }
  _items = _items.map((i) => (i.id === id ? { ...i, qty } : i));
  writeStorage(_items);
  notify();
}

function clear(): void {
  _items = [];
  writeStorage(_items);
  notify();
}

/** Remove all items belonging to a specific group key. */
function clearGroup(groupKey: string): void {
  const [shopId, startDate, endDate] = groupKey.split("|");
  _items = _items.filter(
    (i) => !(i.shopId === shopId && i.startDate === startDate && i.endDate === endDate),
  );
  writeStorage(_items);
  notify();
}

function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.round((e - s) / 86_400_000) + 1;
}

function buildGroups(items: CartItem[]): CartGroup[] {
  const map = new Map<string, CartGroup>();
  for (const item of items) {
    const key = `${item.shopId}|${item.startDate}|${item.endDate}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        shopId: item.shopId,
        shopName: item.shopName,
        startDate: item.startDate,
        endDate: item.endDate,
        items: [],
        estimatedRental: 0,
        estimatedDeposit: 0,
      });
    }
    const g = map.get(key)!;
    g.items.push(item);
    const nights = nightsBetween(item.startDate, item.endDate);
    g.estimatedRental += item.pricePerDay * nights * item.qty;
    g.estimatedDeposit += item.deposit * item.qty;
  }
  return Array.from(map.values());
}

/* ── hook ───────────────────────────────────────────────────────── */

export type CartStore = {
  items: CartItem[];
  add: typeof add;
  remove: typeof remove;
  setQty: typeof setQty;
  clear: typeof clear;
  clearGroup: typeof clearGroup;
  groups: CartGroup[];
};

/**
 * SSR-safe cart hook backed by localStorage.
 * Multiple components share the same in-memory store — all stay in sync.
 */
export function useCart(): CartStore {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    items,
    add,
    remove,
    setQty,
    clear,
    clearGroup,
    groups: buildGroups(items),
  };
}
