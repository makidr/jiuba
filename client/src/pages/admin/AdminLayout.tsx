import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Mic2,
  Music2,
  BarChart3,
  Calendar,
  ChevronRight,
  QrCode,
  Globe,
} from "lucide-react";

const navItems = [
  { path: "/admin/performers", label: "歌手管理", icon: Mic2 },
  { path: "/admin/songs", label: "歌曲管理", icon: Music2 },
  { path: "/admin/sessions", label: "场次管理", icon: Calendar },
  { path: "/admin/qrcodes", label: "桌号二维码", icon: QrCode },
  { path: "/admin/revenue", label: "收益统计", icon: BarChart3 },
  { path: "/admin/settings", label: "网址设置", icon: Globe },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Mic2 size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-serif font-semibold text-sidebar-foreground">管理后台</p>
              <p className="text-xs text-muted-foreground">酒吧点歌系统</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location === path || location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer ${
                    active
                      ? "bg-sidebar-primary/20 text-sidebar-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={14} className="text-sidebar-primary" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground text-xs"
            >
              ← 返回观众端
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
