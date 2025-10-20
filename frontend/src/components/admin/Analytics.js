import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Card } from "../ui/card";
import { Users, Package, Activity, DollarSign, TrendingUp } from "lucide-react";

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white">Loading analytics...</div>;
  }

  const stats = [
    {
      label: "Total Users",
      value: analytics?.total_users || 0,
      icon: Users,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20"
    },
    {
      label: "Total Packs",
      value: analytics?.total_packs || 0,
      icon: Package,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20"
    },
    {
      label: "Transactions",
      value: analytics?.total_transactions || 0,
      icon: Activity,
      color: "text-green-400",
      bgColor: "bg-green-500/20"
    },
    {
      label: "Volume (TON)",
      value: analytics?.total_volume_ton?.toFixed(2) || "0.00",
      icon: DollarSign,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20"
    },
  ];

  return (
    <div className="space-y-6" data-testid="admin-analytics">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Analytics Dashboard
        </h2>
        <p className="text-gray-400">Monitor your platform performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="glass-card p-6"
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
                <TrendingUp className="text-green-400" size={18} />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk' }}>
          Recent Activity
        </h3>
        <div className="text-gray-400">
          <p>Activity charts and detailed metrics will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;