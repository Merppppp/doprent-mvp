import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminSidebar from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");

  return (
    <div className="seller-dashboard">
      <AdminSidebar />
      <main className="seller-main">{children}</main>
    </div>
  );
}
