import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, School, Settings, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // 1. Check if user is logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check if user has admin role
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="text-xl font-semibold text-red-600">Access Denied</div>
        <p className="text-gray-600">You do not have permission to access the admin panel.</p>
        <Link to="/app" className="text-blue-600 hover:underline">
          Return to App
        </Link>
      </div>
    );
  }

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Schools Management", path: "/admin/schools", icon: School },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-wider">HK SCHOOL<br/><span className="text-blue-400">ADMIN</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path) 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
