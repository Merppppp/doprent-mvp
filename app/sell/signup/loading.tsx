import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px 80px" }}>
      <LoadingBar />
      <Skeleton style={{ height: 26, width: 220, marginBottom: 12 }} />
      <Skeleton style={{ height: 14, width: "70%", marginBottom: 28 }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <Skeleton style={{ height: 13, width: 100, marginBottom: 6 }} />
          <Skeleton style={{ height: 44, borderRadius: 8 }} />
        </div>
      ))}
      <Skeleton style={{ height: 48, borderRadius: 8, marginTop: 10 }} />
    </div>
  );
}
