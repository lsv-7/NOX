import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth";
import AdminConsole from "@/components/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuthenticated = await verifyAdminSession();
  
  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  return <AdminConsole />;
}
