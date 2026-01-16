import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Settings, Activity, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboardPage() {
  const stats = [
    {
      title: "System Status",
      value: "Operational",
      icon: Activity,
      color: "text-green-600",
      description: "All systems normal"
    },
    {
      title: "Active Users",
      value: "Admin",
      icon: Users,
      color: "text-blue-600",
      description: "Current session"
    }
  ];

  const quickLinks = [
    {
      title: "Schools Management",
      icon: School,
      href: "/admin/schools",
      description: "Manage school database, crawler, and discovery.",
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/admin/settings",
      description: "Configure system preferences and admin accounts.",
      color: "bg-slate-50 text-slate-600"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
        <p className="text-slate-500 mt-2">Welcome back to the HK School Admin Portal.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid gap-6 md:grid-cols-2">
          {quickLinks.map((link, index) => (
            <Link key={index} to={link.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 h-full">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${link.color}`}>
                    <link.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-lg">{link.title}</h4>
                    <p className="text-slate-500 mt-1">{link.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
