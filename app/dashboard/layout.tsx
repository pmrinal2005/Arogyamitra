import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import CrisisFooter from "@/components/dashboard/CrisisFooter";
import CarePingRealtime from "@/components/dashboard/CarePingRealtime";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell font-scale-md flex min-h-screen">
      <CarePingRealtime />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        <CrisisFooter />
      </div>
    </div>
  );
}
