"use client";

type PrintItem = {
  name: string;
  size?: string | null;
  unitCode?: string | null;
  rentalTotal: number;
  deposit: number;
};

type BookingPrintData = {
  bookingId: string;
  shopName: string;
  status: string;
  recipientName?: string | null;
  phone?: string | null;
  address?: string | null;
  rentalWindow: string;
  shippingFee?: number | null;
  totalDue: number;
  carrier?: string | null;
  trackingNumber?: string | null;
  outboundMethod?: string | null;
  returnMethod?: string | null;
  items: PrintItem[];
};

function methodLabel(m: string) {
  return m === "express" ? "ส่งด่วน" : "ส่งพัสดุ";
}

export default function PrintBookingButton({ data }: { data: BookingPrintData }) {
  function handlePrint() {
    const itemRows = data.items
      .map(
        (item, i) =>
          `<tr>
            <td class="idx">${i + 1}</td>
            <td>
              <span class="item-name">${item.name}</span>
              ${item.size ? `<span class="item-tag">${item.size}</span>` : ""}
              ${item.unitCode ? `<span class="item-tag mono">${item.unitCode}</span>` : ""}
            </td>
            <td class="num">${item.rentalTotal.toLocaleString()}</td>
            <td class="num">${item.deposit.toLocaleString()}</td>
          </tr>`,
      )
      .join("");

    const subtotalRental = data.items.reduce((s, i) => s + i.rentalTotal, 0);
    const subtotalDeposit = data.items.reduce((s, i) => s + i.deposit, 0);

    const infoRows = [
      ["วันเช่า", data.rentalWindow],
      ["ผู้รับ", data.recipientName ?? "-"],
      ["โทร", data.phone ?? "-"],
      data.carrier ? ["ขนส่ง", data.carrier] : null,
      data.trackingNumber ? ["เลขพัสดุ", data.trackingNumber] : null,
      data.outboundMethod ? ["วิธีส่งขาไป", methodLabel(data.outboundMethod)] : null,
      data.returnMethod ? ["วิธีส่งขากลับ", methodLabel(data.returnMethod)] : null,
    ].filter(Boolean) as [string, string][];

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<title>ใบจอง #${data.bookingId.slice(0, 8)}</title>
<style>
  @page { size: A5; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; color: #222; line-height: 1.45; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 2px solid #222; margin-bottom: 12px; }
  .brand { font-size: 16px; font-weight: 800; letter-spacing: -0.03em; }
  .brand small { display: block; font-size: 11px; font-weight: 400; color: #666; letter-spacing: 0; }
  .meta { text-align: right; font-size: 11px; color: #555; }
  .meta .status { display: inline-block; font-size: 10px; padding: 1px 8px; border: 1px solid #888; border-radius: 999px; margin-top: 2px; }

  .section { font-weight: 700; font-size: 11.5px; margin: 10px 0 5px; padding-bottom: 2px; border-bottom: 1px solid #ddd; }

  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .info-table td { padding: 3px 6px; vertical-align: top; }
  .info-table td:first-child { color: #666; white-space: nowrap; width: 90px; }
  .info-table td:last-child { font-weight: 500; }

  .address-box { border: 1px solid #ccc; border-radius: 5px; padding: 7px 10px; margin-bottom: 10px; font-size: 11.5px; line-height: 1.5; }
  .address-box strong { font-size: 12px; }

  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .items-table th { text-align: left; font-size: 10.5px; font-weight: 600; color: #666; border-bottom: 1px solid #bbb; padding: 3px 6px; }
  .items-table th.num, .items-table td.num { text-align: right; }
  .items-table td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  .items-table td.idx { color: #999; width: 20px; }
  .item-name { font-weight: 500; }
  .item-tag { display: inline-block; font-size: 10px; background: #f0f0f0; border-radius: 3px; padding: 0 4px; margin-left: 4px; vertical-align: middle; }
  .item-tag.mono { font-family: ui-monospace, monospace; letter-spacing: 0.03em; }

  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table td { padding: 3px 6px; }
  .summary-table td:last-child { text-align: right; font-weight: 500; }
  .summary-table .label { color: #666; }
  .total-row td { border-top: 1.5px solid #222; font-weight: 700; font-size: 13px; padding-top: 5px; }

  .footer { margin-top: 14px; font-size: 10px; color: #aaa; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    DopRent
    <small>${data.shopName}</small>
  </div>
  <div class="meta">
    #${data.bookingId.slice(0, 8).toUpperCase()}
    <br/><span class="status">${data.status}</span>
  </div>
</div>

<div class="section">ข้อมูลการจอง</div>
<table class="info-table">${infoRows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join("")}</table>

<div class="section">ที่อยู่จัดส่ง</div>
<div class="address-box">
  <strong>${data.recipientName ?? ""}</strong> ${data.phone ? `(${data.phone})` : ""}<br/>
  ${data.address ?? "-"}
</div>

<div class="section">รายการสินค้า</div>
<table class="items-table">
  <thead>
    <tr>
      <th></th>
      <th>สินค้า</th>
      <th class="num">ค่าเช่า</th>
      <th class="num">มัดจำ</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>

<div class="section">สรุปยอด</div>
<table class="summary-table">
  <tr><td class="label">รวมค่าเช่า</td><td>${subtotalRental.toLocaleString()} บาท</td></tr>
  <tr><td class="label">รวมมัดจำ</td><td>${subtotalDeposit.toLocaleString()} บาท</td></tr>
  <tr><td class="label">ค่าจัดส่ง</td><td>${data.shippingFee != null ? `${data.shippingFee.toLocaleString()} บาท` : "ยังไม่กำหนด"}</td></tr>
  <tr class="total-row"><td>รวมทั้งหมด</td><td>${data.totalDue.toLocaleString()} บาท</td></tr>
</table>

<div class="footer">พิมพ์จาก doprent.com</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=520,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onafterprint = () => w.close();
    setTimeout(() => w.print(), 300);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="btn btn-outline"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      พิมพ์ใบจอง
    </button>
  );
}
