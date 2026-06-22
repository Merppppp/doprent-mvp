import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ padding: "28px 24px", maxWidth: 900 }}>
      <LoadingBar />
      <Skeleton style={{ height: 24, width: 180, marginBottom: 20 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 32, width: 80, borderRadius: 999 }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Skeleton style={{ height: 16, width: "45%" }} />
            <Skeleton style={{ height: 22, width: 70, borderRadius: 999 }} />
          </div>
          <Skeleton style={{ height: 13, width: "60%", marginBottom: 6 }} />
          <Skeleton style={{ height: 13, width: "35%" }} />
        </div>
      ))}
    </div>
  );
}
