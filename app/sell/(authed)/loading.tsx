import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ padding: "28px 24px", maxWidth: 900 }}>
      <LoadingBar />
      <Skeleton style={{ height: 24, width: 200, marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 90, borderRadius: 12 }} />
        ))}
      </div>
      <Skeleton style={{ height: 18, width: 120, marginBottom: 16 }} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} style={{ height: 44, marginBottom: 8, borderRadius: 8 }} />
      ))}
    </div>
  );
}
