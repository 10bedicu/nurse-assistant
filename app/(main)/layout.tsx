import { MainSidebar } from "@/components/main-sidebar";

import { SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <MainSidebar />
      <div className="bg-sidebar flex items-center justify-center h-screen overflow-hidden py-4 pr-4 w-full">
        <div
          className="inset-0 absolute"
          style={{
            background:
              "linear-gradient(color-mix(in srgb, var(--color-background) 60%, transparent), color-mix(in srgb, var(--color-background) 60%, transparent)), url('/blurred_2.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {children}
      </div>
    </SidebarProvider>
  );
}
