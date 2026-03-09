import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { RefreshCw, TrendingUp, Users, AlertTriangle, Target } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const AdvancedAnalytics = () => {
  const [activeTab, setActiveTab] = useState("rfm");
  const [loading, setLoading] = useState(false);
  
  // RFM data
  const [rfmData, setRfmData] = useState(null);
  
  // Cohort data
  const [cohortData, setCohortData] = useState(null);
  
  // Churn prediction data
  const [churnData, setChurnData] = useState(null);
  
  // Activity heatmap data
  const [activityHeatmap, setActivityHeatmap] = useState(null);
  
  // Pack trends data
  const [packTrends, setPackTrends] = useState(null);
  
  // Revenue trends data
  const [revenueTrends, setRevenueTrends] = useState(null);
  
  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const [rfm, cohort, churn, heatmap, packs, revenue] = await Promise.all([
        axios.get(`${API}/admin/analytics/rfm`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/analytics/cohorts`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/analytics/churn-prediction`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/analytics/activity-heatmap`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/analytics/pack-trends`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/analytics/revenue-trends`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setRfmData(rfm.data);
      setCohortData(cohort.data);
      setChurnData(churn.data);
      setActivityHeatmap(heatmap.data);
      setPackTrends(packs.data);
      setRevenueTrends(revenue.data);
      toast.success("Analytics loaded successfully");
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case "high":
        return "bg-red-500/20 text-red-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      case "low":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getSegmentColor = (segment) => {
    switch (segment) {
      case "best_customers":
        return "bg-emerald-500/20 text-emerald-400";
      case "at_risk":
        return "bg-orange-500/20 text-orange-400";
      case "lost":
        return "bg-red-500/20 text-red-400";
      case "potential_high_value":
        return "bg-cyan-500/20 text-cyan-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getSegmentLabel = (segment) => {
    switch (segment) {
      case "best_customers":
        return "🌟 Best Customers";
      case "at_risk":
        return "⚠️ At Risk";
      case "lost":
        return "❌ Lost";
      case "potential_high_value":
        return "🎯 Potential High Value";
      default:
        return segment;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={28} className="text-cyan-400" />
          <h1 className="text-2xl font-bold neon-cyan">Advanced Analytics</h1>
        </div>
        <Button
          onClick={fetchAllAnalytics}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 bg-white/5 border border-white/10">
          <TabsTrigger value="rfm">RFM</TabsTrigger>
          <TabsTrigger value="churn">Churn</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="heatmap">Activity</TabsTrigger>
          <TabsTrigger value="packs">Packs</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* RFM Analysis */}
        <TabsContent value="rfm" className="space-y-4">
          {rfmData && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Total Users</div>
                  <div className="text-3xl font-bold neon-cyan">{rfmData.total_users}</div>
                </Card>
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Active Users</div>
                  <div className="text-3xl font-bold text-green-400">{rfmData.active_users}</div>
                </Card>
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Active Rate</div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {rfmData.total_users > 0 ? ((rfmData.active_users / rfmData.total_users) * 100).toFixed(1) : 0}%
                  </div>
                </Card>
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Insights</div>
                  <div className="text-sm text-cyan-400 font-semibold">{rfmData.insights?.length || 0} segments</div>
                </Card>
              </div>

              {/* Segments */}
              <div className="space-y-3">
                {Object.entries(rfmData.segments).map(([segment, users]) => (
                  <Card key={segment} className="glass-card p-4 border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getSegmentColor(segment)}>
                          {users.length}
                        </Badge>
                        <span className="font-semibold">{getSegmentLabel(segment)}</span>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {users.slice(0, 5).map((user, idx) => (
                        <div key={idx} className="text-sm text-gray-400 py-1 flex justify-between">
                          <span>{user.username || `User ${user.user_id?.substring(0, 8)}`}</span>
                          <span className="text-cyan-400">
                            {user.monetary > 0 ? `$${user.monetary.toFixed(2)}` : "New"}
                          </span>
                        </div>
                      ))}
                      {users.length > 5 && (
                        <div className="text-sm text-gray-500 py-1">
                          ... and {users.length - 5} more
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Insights */}
              {rfmData.insights && rfmData.insights.length > 0 && (
                <Card className="glass-card p-4 border-white/10">
                  <h3 className="font-semibold mb-2 text-cyan-400">Key Insights</h3>
                  <ul className="space-y-1">
                    {rfmData.insights.map((insight, idx) => (
                      <li key={idx} className="text-sm text-gray-300">• {insight}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Churn Prediction */}
        <TabsContent value="churn" className="space-y-4">
          {churnData && (
            <>
              {/* Risk Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass-card p-4 border-red-500/20 bg-red-500/10">
                  <div className="text-sm text-red-300">High Risk</div>
                  <div className="text-3xl font-bold text-red-400">
                    {churnData.summary.high_risk_count}
                  </div>
                </Card>
                <Card className="glass-card p-4 border-yellow-500/20 bg-yellow-500/10">
                  <div className="text-sm text-yellow-300">Medium Risk</div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {churnData.summary.medium_risk_count}
                  </div>
                </Card>
                <Card className="glass-card p-4 border-green-500/20 bg-green-500/10">
                  <div className="text-sm text-green-300">Low Risk</div>
                  <div className="text-3xl font-bold text-green-400">
                    {churnData.summary.low_risk_count}
                  </div>
                </Card>
              </div>

              {/* Risk Breakdown */}
              {["high", "medium", "low"].map((risk) => (
                <Card key={risk} className="glass-card p-4 border-white/10">
                  <h3 className={`font-semibold mb-3 ${getRiskColor(risk)}`}>
                    {risk.toUpperCase()} RISK USERS
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {churnData.churn_risk[risk].slice(0, 8).map((user, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm bg-black/30 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{user.username || "Unknown"}</Badge>
                          <span className="text-gray-400">
                            Inactive {user.days_inactive}d
                          </span>
                        </div>
                        <span className={getRiskColor(risk)}>Score: {user.risk_score}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* Cohort Analysis */}
        <TabsContent value="cohorts" className="space-y-4">
          {cohortData && (
            <Card className="glass-card p-4 border-white/10">
              <h3 className="font-semibold mb-4 text-cyan-400">Cohort Retention</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(cohortData.cohorts).map(([month, data]) => (
                  <div key={month} className="bg-black/30 p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-cyan-400">{month}</span>
                      <div className="flex gap-3">
                        <Badge variant="outline">{data.total} users</Badge>
                        <Badge className="bg-green-500/20 text-green-400">
                          {data.retention_rate}% retention
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Avg spending: ${data.avg_spending} | Total: ${data.spending}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Activity Heatmap */}
        <TabsContent value="heatmap" className="space-y-4">
          {activityHeatmap && (
            <>
              <Card className="glass-card p-4 border-white/10">
                <h3 className="font-semibold mb-2 text-cyan-400">Peak Activity: {activityHeatmap.peak_hour}</h3>
                <p className="text-sm text-gray-400 mb-4">Total activities: {activityHeatmap.total_activities}</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityHeatmap.heatmap}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="hour" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(0,255,255,0.3)" }}
                      cursor={{ fill: "rgba(0,255,255,0.1)" }}
                    />
                    <Bar dataKey="activities" fill="#00ffff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Pack Trends */}
        <TabsContent value="packs" className="space-y-4">
          {packTrends && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Total Packs</div>
                  <div className="text-3xl font-bold neon-cyan">{packTrends.total_packs}</div>
                </Card>
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Total Revenue</div>
                  <div className="text-3xl font-bold text-green-400">${packTrends.total_revenue}</div>
                </Card>
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Avg per Pack</div>
                  <div className="text-3xl font-bold text-cyan-300">
                    ${packTrends.total_packs > 0 ? (packTrends.total_revenue / packTrends.total_packs).toFixed(2) : "0"}
                  </div>
                </Card>
              </div>

              <Card className="glass-card p-4 border-white/10">
                <h3 className="font-semibold mb-4 text-cyan-400">Top Packs by Popularity</h3>
                <div className="space-y-3">
                  {packTrends.packs.map((pack, idx) => (
                    <div key={idx} className="bg-black/30 p-3 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-cyan-400">#{idx + 1} {pack.name}</span>
                          <span className="text-gray-400 ml-2">${pack.price}</span>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          {pack.buyers} buyers
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400">
                        Sold: {pack.total_sold} | Revenue: ${pack.revenue} | Score: {pack.popularity_score}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Revenue Trends */}
        <TabsContent value="revenue" className="space-y-4">
          {revenueTrends && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Total Revenue (30d)</div>
                  <div className="text-3xl font-bold text-green-400">${revenueTrends.total_revenue}</div>
                </Card>
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Daily Average</div>
                  <div className="text-3xl font-bold text-cyan-400">${revenueTrends.avg_daily_revenue}</div>
                </Card>
                <Card className="glass-card p-4 border-white/10">
                  <div className="text-sm text-gray-400">Peak Day</div>
                  <div className="text-sm text-cyan-400 font-semibold">{revenueTrends.peak_day.date}</div>
                  <div className="text-2xl font-bold text-green-400">${revenueTrends.peak_day.revenue}</div>
                </Card>
              </div>

              <Card className="glass-card p-4 border-white/10">
                <h3 className="font-semibold mb-4 text-cyan-400">30-Day Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrends.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#888" style={{ fontSize: "12px" }} />
                    <YAxis stroke="#888" />
                    <Tooltip
                      contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(0,255,255,0.3)" }}
                      formatter={(value) => `$${value}`}
                      cursor={{ stroke: "#00ffff", strokeWidth: 2 }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#00ff00"
                      strokeWidth={2}
                      dot={false}
                      name="Daily Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;
