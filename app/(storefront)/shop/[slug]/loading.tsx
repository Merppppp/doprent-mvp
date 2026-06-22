import { Skeleton, SkeletonCard, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
      <LoadingBar />
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Skeleton style={{ width: 72, height: 72, borderRadius: 999 }} />
        <div>
          <Skeleton style={{ height: 22, width: 180, marginBottom: 8 }} />
          <Skeleton style={{ height: 14, width: 120 }} />
        </div>
      </div>
      <Skeleton style={{ height: 14, width: "80%", marginBottom: 28 }} />
      <div className="grid-4" style={{ gap: "20px 16px" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
