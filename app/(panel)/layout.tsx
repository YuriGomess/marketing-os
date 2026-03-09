import { Sidebar } from "@/components/panel/sidebar";
import { Topbar } from "@/components/panel/topbar";

export default function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <Topbar />

      <main className="px-4 pb-8 pt-28 md:pl-[20rem] md:pr-8 md:pt-24">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
