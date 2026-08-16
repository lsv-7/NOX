import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth";
import DeveloperConsole from "@/components/DeveloperConsole";

export const dynamic = "force-dynamic";

export default async function AdminDeveloperPage() {
  const isAuthenticated = await verifyAdminSession();
  
  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  return <DeveloperConsole />;
}
