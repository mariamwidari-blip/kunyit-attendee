import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, Users, UserPlus, QrCode, LogOut, BarChart3, Calendar } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export default function Layout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  const navItems = [
    { to: "/dashboard", icon: Home, label: "Dashboard" },
    { to: "/events", icon: Calendar, label: "Event" },
    { to: "/attendance", icon: QrCode, label: "Absen" },
    { to: "/people", icon: Users, label: "Daftar" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-primary">H-Gate050</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Keluar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-lg">
        <div className="container mx-auto flex justify-around px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors rounded-lg"
              activeClassName="bg-primary/10 text-primary font-semibold"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
