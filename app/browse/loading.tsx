import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 80 }}>
      <Skeleton style={{ height: 32, width: 200, marginBottom: 8 }} />
      <Skeleton style={{ height: 14, width: 300, marginBottom: 28 }} />
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 30, marginBottom: 12 }} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
