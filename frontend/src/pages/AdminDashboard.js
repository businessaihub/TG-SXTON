import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { Button } from "../components/ui/button";
import { LayoutDashboard, Package, Settings, Activity, LogOut, Image, List, Sparkles, Ticket, AlertCircle, FileText, Crown, TrendingUp, Zap, Sliders, Gift, DollarSign, Gamepad2 } from "lucide-react";
import Analytics from "../components/admin/Analytics";
import AdvancedAnalytics from "../components/admin/AdvancedAnalytics";
import PackManagement from "../components/admin/PackManagement";
import BannerManagement from "../components/admin/BannerManagement";
import QuestManagement from "../components/admin/QuestManagement";
import SettingsPanel from "../components/admin/SettingsPanel";
import ActivitySimulation from "../components/admin/ActivitySimulation";
import ActivityManagement from "../components/admin/ActivityManagement";
import PromoCodes from "../components/admin/PromoCodes";
import HoldSettings from "../components/admin/HoldSettings";
import PackHoldOverrides from "../components/admin/PackHoldOverrides";
import Moderation from "../components/admin/Moderation";
import VipTierManagement from "../components/admin/VipTierManagement";
import SystemLogs from "../components/admin/SystemLogs";
import DailySpinManagement from "../components/admin/DailySpinManagement";
import WithdrawalApproval from "../components/admin/WithdrawalApproval";
import GameManagement from "../components/admin/GameManagement";

// ✅ VARIANT B COMPLETE (6/9 features)
// Features implemented: Analytics, UserManagement, PaymentHistory, BroadcastMessages, PromoCodes, Moderation
// TODO VARIANT C: SystemLogs, VipTierManagement, AdvancedAnalytics (skeleton code - see PROGRESS_NOTES.md)

const AdminDashboard = ({ setIsAdmin }) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState("analytics");
  const [adminToken, setAdminToken] = useState("");
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    setAdminToken(token || "");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAdmin(false);
    navigate("/admin/login");
  };

  const menuItems = [
    { id: "analytics", label: "Analytics", icon: LayoutDashboard },
    { id: "advanced", label: "Advanced", icon: TrendingUp },
    { id: "packs", label: "Packs", icon: Package },
    { id: "games", label: "Games", icon: Gamepad2 },
    { id: "banners", label: "Banners", icon: Image },
    { id: "quests", label: "Quests", icon: Sparkles },
    { id: "activity", label: "Activity Management", icon: List },
    { id: "systemlogs", label: "System Logs", icon: FileText },
    { id: "promo", label: "Promo Codes", icon: Ticket },
    { id: "daily-spin", label: "Daily Spin", icon: Gift },
    { id: "withdrawals", label: "Withdrawals", icon: DollarSign },
    { id: "hold", label: "Hold Boost", icon: Zap },
    { id: "hold-packs", label: "Pack Overrides", icon: Sliders },
    { id: "moderation", label: "Moderation", icon: AlertCircle },
    { id: "vip", label: "VIP Tiers", icon: Crown },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "simulation", label: "Activity Simulation", icon: Activity },
  ];

  return (
<div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]" style={{ position: 'relative' }}>
  <div className="flex h-screen" style={{ position: 'relative' }}>
    {/* Sidebar */}
    <div className="w-64 glass-card m-4 p-6 flex flex-col">
      <h1 className="text-2xl font-bold neon-cyan mb-8" style={{ fontFamily: 'Space Grotesk' }}>
        StickersXTon
        <span className="block text-sm text-gray-400 mt-1">Admin Panel</span>
      </h1>
      
      <nav className="flex-1 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              data-testid={`admin-menu-${item.id}`}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
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
<div className="flex-1 overflow-y-auto overflow-x-hidden p-6" style={{ position: 'relative' }}>
  <div className="min-h-full" style={{ position: 'relative' }}>
    {currentView === "analytics" && <Analytics />}
    {currentView === "advanced" && <AdvancedAnalytics />}
    {currentView === "packs" && <PackManagement />}
    {currentView === "games" && <GameManagement adminToken={adminToken} />}
    {currentView === "banners" && <BannerManagement />}
    {currentView === "quests" && <QuestManagement />}
    {currentView === "activity" && <ActivityManagement />}
    {currentView === "systemlogs" && <SystemLogs />}
    {currentView === "promo" && <PromoCodes adminToken={adminToken} />}
    {currentView === "daily-spin" && <DailySpinManagement language={language} />}
    {currentView === "withdrawals" && <WithdrawalApproval language={language} />}
    {currentView === "hold" && <HoldSettings adminToken={adminToken} />}
    {currentView === "hold-packs" && <PackHoldOverrides adminToken={adminToken} />}
    {currentView === "moderation" && <Moderation />}
    {currentView === "vip" && <VipTierManagement />}
    {currentView === "settings" && <SettingsPanel />}
    {currentView === "simulation" && <ActivitySimulation />}
  </div>
</div>
</div>
</div>
);
};

export default AdminDashboard;