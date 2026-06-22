import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ padding: "28px 24px", maxWidth: 900 }}>
      <LoadingBar />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <Skeleton style={{ height: 24, width: 160 }} />
        <Skeleton style={{ height: 40, width: 130, borderRadius: 8 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
            <Skeleton style={{ aspectRatio: "3/4", width: "100%" }} />
            <div style={{ padding: 12 }}>
              <Skeleton style={{ height: 14, width: "70%", marginBottom: 8 }} />
              <Skeleton style={{ height: 12, width: "50%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
