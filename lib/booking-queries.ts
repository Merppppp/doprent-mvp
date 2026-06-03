import { createClient } from "@/lib/supabase/server";
import type { Address, BookingDetail } from "@/lib/types";

const BOOKING_SELECT =
  "id,renter_id,boutique_id,dress_id,start_date,end_date,rental_total,deposit," +
  "shipping_fee,status,slip_path,address_id,recipient_name,phone,address_text," +
  "current_due_at,cancel_reason,cancel_from_status,created_at,updated_at," +
  "dresses(name,slug,images),boutiques(name,slug,line_url,promptpay_id)";

type RawJoin = {
  dresses?: { name?: string; slug?: string; images?: string[] } | null;
  boutiques?: {
    name?: string;
    slug?: string;
    line_url?: string;
    promptpay_id?: string | null;
  } | null;
  [k: string]: unknown;
};

function toDetail(row: RawJoin): BookingDetail {
  const d = row.dresses ?? null;
  const b = row.boutiques ?? null;
  const { dresses: _d, boutiques: _b, ...base } = row;
  void _d;
  void _b;
  return {
    ...(base as unknown as BookingDetail),
    dress_name: d?.name ?? null,
    dress_slug: d?.slug ?? null,
    dress_image: d?.images?.[0] ?? null,
    boutique_name: b?.name ?? null,
    boutique_slug: b?.slug ?? null,
    boutique_line_url: b?.line_url ?? null,
    boutique_promptpay_id: b?.promptpay_id ?? null,
  };
}

export async function getMyAddresses(): Promise<Address[]> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Address[];
}

export async function getRenterBookings(): Promise<BookingDetail[]> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("renter_id", user.id)
    .order("created_at", { ascending: false });
  return ((data as unknown as RawJoin[] | null) ?? []).map(toDetail);
}

export async function getSellerBookings(): Promise<BookingDetail[]> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data: boutiques } = await sb
    .from("boutiques")
    .select("id")
    .eq("owner_id", user.id);
  const ids = (boutiques ?? []).map((b: { id: string }) => b.id);
  if (ids.length === 0) return [];
  const { data } = await sb
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("boutique_id", ids)
    .order("created_at", { ascending: false });
  return ((data as unknown as RawJoin[] | null) ?? []).map(toDetail);
}

/** Single booking by id — RLS returns it only to renter / seller / admin. */
export async function getBookingForView(id: string): Promise<BookingDetail | null> {
  const sb = createClient();
  const { data } = await sb.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  return toDetail(data as unknown as RawJoin);
}

/** Is the current user the owner of this booking's boutique? (for view role) */
export async function currentUserIsSellerOf(boutiqueId: string): Promise<boolean> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await sb
    .from("boutiques")
    .select("id")
    .eq("id", boutiqueId)
    .eq("owner_id", user.id)
    .maybeSingle();
  return !!data;
}
