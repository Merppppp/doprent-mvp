import { Skeleton, LoadingBar } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="container" style={{ maxWidth: 720, padding: "40px 20px 80px" }}>
      <LoadingBar />
      <Skeleton style={{ height: 30, width: 240, marginBottom: 20 }} />
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} style={{ height: 14, width: `${70 + Math.random() * 30}%`, marginBottom: 10 }} />
      ))}
    </div>
  );
}
