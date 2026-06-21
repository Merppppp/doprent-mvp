import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 20px 80px", width: "100%" }}>
      <LoadingBar />
      <Skeleton style={{ height: 28, width: 160, marginBottom: 10 }} />
      <Skeleton style={{ height: 14, width: "80%", marginBottom: 28 }} />
      <Skeleton style={{ height: 44, marginBottom: 14, borderRadius: 8 }} />
      <Skeleton style={{ height: 44, marginBottom: 14, borderRadius: 8 }} />
      <Skeleton style={{ height: 48, marginBottom: 16, borderRadius: 8 }} />
      <Skeleton style={{ height: 14, width: "50%", margin: "0 auto" }} />
    </div>
  );
}
