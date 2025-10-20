import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Switch } from "../ui/switch";
import { Users, Package, Activity, DollarSign, TrendingUp, Wifi, Edit2, Save, Coins } from "lucide-react";
import { toast } from "sonner";

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [useRealData, setUseRealData] = useState(false);
  const [editableData, setEditableData] = useState({
    total_users: 0,
    online_users: 0,
    total_volume: 0,
    total_sxton_distributed: 0,
    total_sxton_spent: 0
  });

  useEffect(() => {
    fetchAnalytics();
    // Simulate live updates every 5 seconds
    const interval = setInterval(() => {
      if (!editMode) {
        simulateLiveUpdate();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [editMode]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
      setEditableData({
        total_users: response.data.total_users || 0,
        online_users: response.data.online_users || Math.floor(Math.random() * (1000 - 150) + 150),
        total_volume: response.data.total_volume_ton || 0,
        total_sxton_distributed: response.data.total_sxton_distributed || 50000,
        total_sxton_spent: response.data.total_sxton_spent || 12000
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setLoading(false);
    }
  };

  const simulateLiveUpdate = () => {
    setEditableData(prev => ({
      ...prev,
      online_users: Math.floor(Math.random() * (1000 - 150) + 150)
    }));
  };

  const handleSaveStats = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.put(`${API}/admin/analytics/override`, editableData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Stats updated successfully");
      setEditMode(false);
      fetchAnalytics();
    } catch (error) {
      toast.error("Error updating stats");
    }
  };

  if (loading) {
    return <div className="text-white">Loading analytics...</div>;
  }

  const stats = [
    {
      label: "Total Users",
      value: useRealData ? (analytics?.total_users || 0) : editableData.total_users,
      icon: Users,
      color: "text-cyan-400",
      bgColor: "bg-gradient-to-br from-cyan-500/20 to-cyan-600/10",
      borderColor: "border-cyan-500/30",
      editable: true
    },
    {
      label: "Online Users",
      value: useRealData ? (analytics?.online_users || Math.floor(Math.random() * (1000 - 150) + 150)) : editableData.online_users,
      icon: Wifi,
      color: "text-green-400",
      bgColor: "bg-gradient-to-br from-green-500/20 to-green-600/10",
      borderColor: "border-green-500/30",
      editable: true,
      live: true
    },
    {
      label: "Total Packs",
      value: analytics?.total_packs || 0,
      icon: Package,
      color: "text-purple-400",
      bgColor: "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
      borderColor: "border-purple-500/30",
      editable: false
    },
    {
      label: "Transactions",
      value: analytics?.total_transactions || 0,
      icon: Activity,
      color: "text-yellow-400",
      bgColor: "bg-gradient-to-br from-yellow-500/20 to-yellow-600/10",
      borderColor: "border-yellow-500/30",
      editable: false
    },
    {
      label: "Volume (TON)",
      value: useRealData ? (analytics?.total_volume_ton?.toFixed(2) || "0.00") : (editableData.total_volume?.toFixed(2) || "0.00"),
      icon: DollarSign,
      color: "text-emerald-400",
      bgColor: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10",
      borderColor: "border-emerald-500/30",
      editable: true
    },
  ];

  return (
    <div className="space-y-6" data-testid="admin-analytics">
      {/* Cosmic background */}
      <div className="cosmic-bg"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Analytics Dashboard
          </h2>
          <p className="text-gray-400">Monitor your platform performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Toggle between Real Data and Manual Edit */}
          <div className="flex items-center gap-3 glass-card px-4 py-2 border border-white/10">
            <span className={`text-sm ${!useRealData ? 'text-cyan-400 font-semibold' : 'text-gray-400'}`}>
              Manual
            </span>
            <Switch
              checked={useRealData}
              onCheckedChange={setUseRealData}
              className="data-[state=checked]:bg-green-500"
            />
            <span className={`text-sm ${useRealData ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
              Real Data
            </span>
          </div>
          
          {!useRealData && (
            <Button
              onClick={() => {
                if (editMode) {
                  handleSaveStats();
                } else {
                  setEditMode(true);
                }
              }}
              data-testid="edit-stats-btn"
              className={`${
                editMode 
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" 
                  : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              } transition-colors shadow-lg`}
            >
              {editMode ? (
                <>
                  <Save size={18} className="mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit2 size={18} className="mr-2" />
                  Edit Stats
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`glass-card p-6 border ${stat.borderColor} ${stat.bgColor} transition-colors duration-300 shadow-xl hover:shadow-2xl relative overflow-hidden`}
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {/* Cosmic particles */}
              <div className="cosmic-particles"></div>
              
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className={`p-3 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
                <div className="flex items-center gap-2">
                  {stat.live && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400">LIVE</span>
                    </div>
                  )}
                  <TrendingUp className="text-green-400" size={18} />
                </div>
              </div>
              
              {editMode && stat.editable ? (
                <Input
                  type="number"
                  step={stat.label.includes("Volume") ? "0.01" : "1"}
                  value={stat.label.includes("Volume") ? editableData.total_volume : 
                         stat.label.includes("Total Users") ? editableData.total_users :
                         editableData.online_users}
                  onChange={(e) => {
                    const field = stat.label.includes("Volume") ? "total_volume" : 
                                  stat.label.includes("Total Users") ? "total_users" :
                                  "online_users";
                    setEditableData({...editableData, [field]: parseFloat(e.target.value) || 0});
                  }}
                  className="text-3xl font-bold text-white bg-white/5 border-white/20 mb-1 relative z-10"
                />
              ) : (
                <div className="text-3xl font-bold text-white mb-1 relative z-10">{stat.value}</div>
              )}
              
              <div className="text-sm text-gray-400 relative z-10">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* SXTon Token Stats */}
      <div className="glass-card p-6 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 relative overflow-hidden">
        <div className="cosmic-particles"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="text-purple-400" size={28} />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              SXTON Token Overview
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-white/5 border border-purple-500/30 relative overflow-hidden">
              <div className="cosmic-particles"></div>
              {editMode ? (
                <Input
                  type="number"
                  value={editableData.total_sxton_distributed}
                  onChange={(e) => setEditableData({...editableData, total_sxton_distributed: parseFloat(e.target.value) || 0})}
                  className="text-2xl font-bold text-purple-400 bg-white/5 border-white/20 mb-1 text-center relative z-10"
                />
              ) : (
                <div className="text-2xl font-bold text-purple-400 mb-1 relative z-10">
                  {editableData.total_sxton_distributed.toLocaleString()}
                </div>
              )}
              <div className="text-sm text-gray-400 relative z-10">Total Distributed</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5 border border-pink-500/30 relative overflow-hidden">
              <div className="cosmic-particles"></div>
              {editMode ? (
                <Input
                  type="number"
                  value={editableData.total_sxton_spent}
                  onChange={(e) => setEditableData({...editableData, total_sxton_spent: parseFloat(e.target.value) || 0})}
                  className="text-2xl font-bold text-pink-400 bg-white/5 border-white/20 mb-1 text-center relative z-10"
                />
              ) : (
                <div className="text-2xl font-bold text-pink-400 mb-1 relative z-10">
                  {editableData.total_sxton_spent.toLocaleString()}
                </div>
              )}
              <div className="text-sm text-gray-400 relative z-10">Total Spent</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-white/5 border border-cyan-500/30 relative overflow-hidden">
              <div className="cosmic-particles"></div>
              <div className="text-2xl font-bold text-cyan-400 mb-1 relative z-10">
                {(editableData.total_sxton_distributed - editableData.total_sxton_spent).toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 relative z-10">Circulating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Activity */}
      <div className="glass-card p-6 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 relative overflow-hidden">
        <div className="cosmic-particles"></div>
        <h3 className="text-xl font-semibold text-white mb-4 relative z-10" style={{ fontFamily: 'Space Grotesk' }}>
          Platform Activity
        </h3>
        <div className="grid grid-cols-3 gap-4 relative z-10">
          <div className="text-center p-4 rounded-lg bg-white/5 border border-green-500/30">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {Math.floor((editableData.online_users / editableData.total_users) * 100)}%
            </div>
            <div className="text-sm text-gray-400">Users Online</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-white/5 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {(editableData.total_volume / (analytics?.total_transactions || 1)).toFixed(2)}
            </div>
            <div className="text-sm text-gray-400">Avg Transaction</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-white/5 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {analytics?.total_packs || 0}
            </div>
            <div className="text-sm text-gray-400">Active Packs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;