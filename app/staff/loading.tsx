import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "60px 20px 80px", textAlign: "center" }}>
      <LoadingBar />
      <Skeleton style={{ width: 56, height: 56, borderRadius: 999, margin: "0 auto 16px" }} />
      <Skeleton style={{ height: 22, width: 200, margin: "0 auto 10px" }} />
      <Skeleton style={{ height: 14, width: "70%", margin: "0 auto 24px" }} />
      <Skeleton style={{ height: 48, borderRadius: 8 }} />
    </div>
  );
}
