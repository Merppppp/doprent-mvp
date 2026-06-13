import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "นโยบายความเป็นส่วนตัว",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div
      className="container"
      style={{ maxWidth: 760, paddingTop: 48, paddingBottom: 80 }}
    >
      {/* Draft disclaimer */}
      <div
        style={{
          background: "oklch(0.97 0.04 90)",
          border: "1px solid oklch(0.85 0.12 90)",
          borderRadius: 8,
          padding: "12px 16px",
          fontSize: 13,
          color: "oklch(0.45 0.14 60)",
          marginBottom: 32,
        }}
      >
        <strong>[ปรับแก้โดยฝ่ายกฎหมาย]</strong> เอกสารนี้เป็นฉบับร่าง รอการตรวจสอบจากที่ปรึกษากฎหมายก่อนเผยแพร่ใช้งานจริง
      </div>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: "-0.01em",
        }}
      >
        นโยบายความเป็นส่วนตัว
      </h1>
      <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 32 }}>
        มีผลบังคับใช้ตั้งแต่: [วันที่มีผลบังคับใช้] · อัปเดตล่าสุด: [วันที่อัปเดต]
      </p>

      <Section title="1. ภาพรวม">
        <p>
          DopRent (&ldquo;บริษัท&rdquo;, &ldquo;เรา&rdquo;, &ldquo;แพลตฟอร์ม&rdquo;) ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่านตาม
          พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) นโยบายนี้อธิบายว่าเราเก็บรวบรวม ใช้ เปิดเผย
          และปกป้องข้อมูลของท่านอย่างไร รวมถึงสิทธิของท่านในฐานะเจ้าของข้อมูล
        </p>
      </Section>

      <Section title="2. ข้อมูลที่เราเก็บรวบรวม">
        <SubTitle>2.1 ข้อมูลที่ท่านให้โดยตรง</SubTitle>
        <ul>
          <li><strong>ข้อมูลบัญชี:</strong> ชื่อ-นามสกุล, อีเมล, รหัสผ่าน (เก็บในรูปแบบ hashed)</li>
          <li><strong>ข้อมูลจัดส่ง:</strong> ที่อยู่จัดส่ง, หมายเลขโทรศัพท์, LINE ID</li>
          <li>
            <strong>เอกสาร KYC (สำหรับผู้ขาย/เจ้าของร้านเท่านั้น):</strong>
            <ul>
              <li>สำเนาบัตรประชาชน (รูปถ่ายหรือ PDF)</li>
              <li>หนังสือรับรองนิติบุคคล (กรณีนิติบุคคล)</li>
              <li>เลขบัตรประชาชน / เลขประจำตัวผู้เสียภาษี (13 หลัก)</li>
            </ul>
          </li>
          <li><strong>ข้อมูลการชำระเงิน:</strong> หลักฐานการโอน (สลิป) ที่ท่านอัปโหลดเพื่อยืนยันการชำระ</li>
        </ul>

        <SubTitle>2.2 ข้อมูลที่เก็บโดยอัตโนมัติ</SubTitle>
        <ul>
          <li><strong>IP Address (hashed):</strong> ใช้เพื่อวิเคราะห์การใช้งานและป้องกันการทุจริต ไม่สามารถย้อนกลับระบุตัวตนได้</li>
          <li><strong>ข้อมูลการใช้งาน:</strong> หน้าที่เยี่ยมชม, การคลิกปุ่ม LINE, เวลา/วันที่เข้าใช้งาน</li>
          <li><strong>อุปกรณ์และเบราว์เซอร์:</strong> ประเภทอุปกรณ์, ขนาดหน้าจอ (ผ่าน Analytics)</li>
        </ul>
      </Section>

      <Section title="3. วัตถุประสงค์การเก็บและใช้ข้อมูล">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)" }}>
              <th style={thStyle}>วัตถุประสงค์</th>
              <th style={thStyle}>ฐานทางกฎหมาย</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["ยืนยันตัวตนผู้ขาย (KYC) และป้องกันการทุจริต", "ความยินยอม (Consent) + ประโยชน์อันชอบด้วยกฎหมาย"],
              ["ดำเนินการเช่า / จัดส่ง / ติดต่อประสานงาน", "การปฏิบัติตามสัญญา (Contract)"],
              ["ส่งการแจ้งเตือนสถานะการจองและการชำระเงิน", "การปฏิบัติตามสัญญา"],
              ["วิเคราะห์การใช้งานและปรับปรุงแพลตฟอร์ม", "ประโยชน์อันชอบด้วยกฎหมาย (Legitimate Interest)"],
              ["ปฏิบัติตามกฎหมายและข้อกำหนดของหน่วยงานกำกับดูแล", "พันธะตามกฎหมาย (Legal Obligation)"],
            ].map(([purpose, basis], i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={tdStyle}>{purpose}</td>
                <td style={tdStyle}>{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="4. การเปิดเผยข้อมูลต่อบุคคลที่สาม">
        <p>เราไม่ขายข้อมูลส่วนบุคคลของท่าน เราอาจเปิดเผยข้อมูลในกรณีดังต่อไปนี้:</p>
        <ul>
          <li>
            <strong>ผู้ขาย (เจ้าของร้าน):</strong> เมื่อท่านทำการจองสำเร็จ ผู้ขายจะได้รับ
            ชื่อ-นามสกุล และที่อยู่จัดส่ง เพื่อวัตถุประสงค์ในการจัดส่งชุดเท่านั้น
          </li>
          <li>
            <strong>ผู้ให้บริการ Cloud / Infrastructure:</strong> ข้อมูลถูกจัดเก็บบนเซิร์ฟเวอร์ที่เชื่อถือได้
            ซึ่งผูกพันด้วยข้อตกลงการประมวลผลข้อมูล (DPA) กับ DopRent
          </li>
          <li>
            <strong>หน่วยงานรัฐ / กระบวนการทางกฎหมาย:</strong> เมื่อมีคำสั่งศาลหรือข้อบังคับทางกฎหมายที่เกี่ยวข้อง
          </li>
        </ul>
        <p>
          <strong>เอกสาร KYC</strong> (บัตรประชาชน, หนังสือรับรองนิติบุคคล) จะเข้าถึงได้เฉพาะเจ้าหน้าที่ตรวจสอบของ DopRent
          เท่านั้น ไม่เปิดเผยต่อผู้ใช้รายอื่น
        </p>
      </Section>

      <Section title="5. ระยะเวลาจัดเก็บและการลบข้อมูล">
        <ul>
          <li><strong>ข้อมูลบัญชี:</strong> เก็บตลอดอายุบัญชี + 1 ปีหลังปิดบัญชี</li>
          <li><strong>ข้อมูลการจองและการชำระเงิน:</strong> 5 ปีนับจากวันที่ธุรกรรมสิ้นสุด (ตามข้อกำหนดทางบัญชี)</li>
          <li><strong>เอกสาร KYC:</strong> 3 ปีนับจากวันที่ยืนยันตัวตน หรือตามข้อกำหนดทางกฎหมายที่เกี่ยวข้อง</li>
          <li><strong>Log / IP hashed:</strong> 90 วัน</li>
          <li><strong>ข้อมูลที่เกินระยะเวลา:</strong> จะถูกลบหรือทำให้ไม่สามารถระบุตัวตนได้โดยอัตโนมัติ</li>
        </ul>
      </Section>

      <Section title="6. สิทธิของเจ้าของข้อมูล">
        <p>ท่านมีสิทธิดังต่อไปนี้ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562:</p>
        <ul>
          <li><strong>สิทธิในการเข้าถึง:</strong> ขอดูข้อมูลส่วนบุคคลที่เราเก็บเกี่ยวกับท่าน</li>
          <li><strong>สิทธิในการแก้ไข:</strong> ขอแก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่ครบถ้วน</li>
          <li><strong>สิทธิในการลบ:</strong> ขอลบข้อมูล (ภายใต้ข้อจำกัดทางกฎหมาย)</li>
          <li><strong>สิทธิในการคัดค้าน:</strong> คัดค้านการประมวลผลข้อมูลในบางวัตถุประสงค์</li>
          <li><strong>สิทธิในการจำกัดการประมวลผล:</strong> ขอให้ระงับการใช้ข้อมูลชั่วคราว</li>
          <li><strong>สิทธิในการโอนย้ายข้อมูล:</strong> ขอรับข้อมูลในรูปแบบที่อ่านได้ด้วยเครื่อง</li>
          <li><strong>สิทธิในการเพิกถอนความยินยอม:</strong> เพิกถอนได้ทุกเมื่อ โดยไม่กระทบสิทธิที่ได้ใช้ก่อนหน้า</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          ในการใช้สิทธิข้างต้น กรุณาติดต่อเราตามช่องทางในข้อ 8 เราจะดำเนินการภายใน 30 วันนับจากวันที่ได้รับคำร้อง
        </p>
      </Section>

      <Section title="7. การรักษาความปลอดภัย">
        <p>
          เราใช้มาตรการรักษาความปลอดภัยทางเทคนิคและองค์กรที่เหมาะสม ได้แก่ การส่งข้อมูลแบบเข้ารหัส HTTPS,
          การจำกัดสิทธิ์เข้าถึงข้อมูล, การ hash รหัสผ่านและ IP Address อย่างไรก็ตาม
          ไม่มีระบบใดที่ปลอดภัยสมบูรณ์ 100%
        </p>
      </Section>

      <Section title="8. ช่องทางติดต่อเจ้าหน้าที่คุ้มครองข้อมูล (DPO)">
        <p>หากมีคำถาม ข้อร้องเรียน หรือต้องการใช้สิทธิตามนโยบายนี้ กรุณาติดต่อ:</p>
        <ul>
          <li>อีเมล: <a href="mailto:privacy@doprent.com" style={{ color: "var(--accent)" }}>privacy@doprent.com</a></li>
          <li>LINE: <a href="https://line.me/R/ti/p/@doprent" target="_blank" rel="noreferrer noopener" style={{ color: "var(--accent)" }}>@doprent</a></li>
        </ul>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>
          [ปรับแก้โดยฝ่ายกฎหมาย — เพิ่มชื่อ DPO, ที่อยู่จดทะเบียนบริษัท และหมายเลขทะเบียนนิติบุคคล]
        </p>
      </Section>

      <Section title="9. การเปลี่ยนแปลงนโยบาย">
        <p>
          เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว หากมีการเปลี่ยนแปลงสาระสำคัญ เราจะแจ้งให้ท่านทราบ
          ผ่านอีเมลหรือแบนเนอร์บนแพลตฟอร์ม การใช้งานแพลตฟอร์มต่อไปหลังวันที่มีผลบังคับใช้ถือว่าท่านยอมรับนโยบายที่ปรับปรุงแล้ว
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: "1px solid var(--line)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.75,
          color: "var(--ink)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: 600, marginTop: 14, marginBottom: 6 }}>{children}</p>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink-2)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  verticalAlign: "top",
};
