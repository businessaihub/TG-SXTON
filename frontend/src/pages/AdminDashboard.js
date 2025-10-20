import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { Button } from "../components/ui/button";
import { LayoutDashboard, Package, Settings, Activity, LogOut, Image } from "lucide-react";
import Analytics from "../components/admin/Analytics";
import PackManagement from "../components/admin/PackManagement";
import BannerManagement from "../components/admin/BannerManagement";
import SettingsPanel from "../components/admin/SettingsPanel";
import ActivitySimulation from "../components/admin/ActivitySimulation";

const AdminDashboard = ({ setIsAdmin }) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState("analytics");

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
    navigate("/admin/login");
  };

  const menuItems = [
    { id: "analytics", label: "Analytics", icon: LayoutDashboard },
    { id: "packs", label: "Packs", icon: Package },
    { id: "banners", label: "Banners", icon: Image },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "simulation", label: "Activity Simulation", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 glass-card m-4 p-6 flex flex-col">
          <h1 className="text-2xl font-bold neon-cyan mb-8" style={{ fontFamily: 'Space Grotesk' }}>
            StickersXTon
            <span className="block text-sm text-gray-400 mt-1">Admin Panel</span>
          </h1>
          
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  data-testid={`admin-menu-${item.id}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    currentView === item.id
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <Button
            onClick={handleLogout}
            data-testid="admin-logout-btn"
            variant="outline"
            className="w-full mt-auto flex items-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {currentView === "analytics" && <Analytics />}
          {currentView === "packs" && <PackManagement />}
          {currentView === "settings" && <SettingsPanel />}
          {currentView === "simulation" && <ActivitySimulation />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;