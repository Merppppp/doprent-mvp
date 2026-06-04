export type BookingRole = "customer" | "seller";

export type CreateBookingInput = {
  dressId: string;
  addressId?: string;
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;   // "YYYY-MM-DD"
  note?: string;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "เกิดข้อผิดพลาด");
  return json as T;
}

export function getBookings(role: BookingRole = "customer") {
  return request(`/api/bookings?role=${role}`);
}

export function getBooking(id: string) {
  return request(`/api/bookings/${id}`);
}

export function createBooking(data: CreateBookingInput) {
  return request("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function acceptBooking(id: string, shippingFee: number) {
  return request(`/api/bookings/${id}/accept`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shippingFee }),
  });
}

export function rejectBooking(id: string) {
  return request(`/api/bookings/${id}/reject`, { method: "PATCH" });
}

export function getBookingQR(id: string) {
  return request<{ qr: string; amount: number; promptpayId: string }>(
    `/api/bookings/${id}/qr`
  );
}

export async function uploadSlip(id: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return request(`/api/bookings/${id}/slip`, { method: "POST", body: fd });
}

export function confirmBooking(id: string) {
  return request(`/api/bookings/${id}/confirm`, { method: "PATCH" });
}
