import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/slider-sidebar";

export default function Layout() {
  return (
    <SidebarProvider >
      <AppSidebar />
      <SidebarTrigger />
    </SidebarProvider>
  );
}
