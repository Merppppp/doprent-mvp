export type CreateAddressInput = {
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode: string;
  isDefault?: boolean;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "เกิดข้อผิดพลาด");
  return json as T;
}

export function getAddresses() {
  return request("/api/addresses");
}

export function createAddress(data: CreateAddressInput) {
  return request("/api/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteAddress(id: string) {
  return request(`/api/addresses/${id}`, { method: "DELETE" });
}
