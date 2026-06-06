import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Spinner, ProgressBar } from "@/components/Loading";

export default function RouteLoading() {
  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <div style={{ display: "grid", gap: 20, maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Spinner size={20} label="กำลังโหลด..." />
        </div>

        <ProgressBar />

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} style={{ height: 30, marginBottom: 12 }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {Array.from({ length: 9 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
