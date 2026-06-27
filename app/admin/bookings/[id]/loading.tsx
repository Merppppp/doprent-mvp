import { Spinner } from "@/components/Loading";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size={28} label="กำลังโหลดรายละเอียดการจอง…" />
    </div>
  );
}
