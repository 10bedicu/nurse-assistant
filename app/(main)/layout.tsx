import { MainSidebar } from "@/components/main-sidebar";

import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { getServerCookie } from "@/utils/store";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = getServerCookie(cookieStore, "nurseAssistantAuthToken", "");

  if (!token) redirect("/login");

  return (
    <SidebarProvider defaultOpen={false}>
      <MainSidebar />
      <div className="bg-sidebar flex items-center justify-center h-screen overflow-hidden py-4 pr-4 w-full">
        <div
          className="inset-0 absolute"
          style={{
            background:
              "linear-gradient(color-mix(in srgb, var(--color-background) 40%, transparent), color-mix(in srgb, var(--color-background) 40%, transparent)), url('/blurred.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {children}
      </div>
    </SidebarProvider>
  );
}
