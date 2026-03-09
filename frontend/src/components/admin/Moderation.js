import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { AlertCircle, Ban, Eye, BarChart3, MessageSquareX, Flag, Globe } from "lucide-react";
import { toast } from "sonner";
import { API } from "../../App";

const Moderation = ({ adminToken }) => {
  const [activeTab, setActiveTab] = useState("reports");
  const [reports, setReports] = useState([
    {
      id: "report_1",
      userId: "user_123",
      username: "suspiciousTrader",
      reason: "Spam/Scam",
      status: "pending",
      reportedAt: new Date(Date.now() - 3600000).toISOString(),
      description: "Sending repeated marketplace spam messages"
    },
    {
      id: "report_2",
      userId: "user_456",
      username: "toxicPlayer",
      reason: "Harassment",
      status: "under_review",
      reportedAt: new Date(Date.now() - 7200000).toISOString(),
      description: "Abusive language in chat"
    }
  ]);

  const [bannedUsers, setBannedUsers] = useState([
    {
      id: "ban_1",
      userId: "user_789",
      username: "bannedUser",
      reason: "Multiple violations",
      bannedAt: new Date(Date.now() - 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 2592000000).toISOString()
    }
  ]);

  const [localizationData, setLocalizationData] = useState({
    en: 45,
    uk: 28,
    tr: 12,
    ru: 18,
    zh: 8,
    ar: 6,
    ko: 4,
    ja: 5,
    de: 9,
    fr: 7,
    th: 3
  });

  const [showBanForm, setShowBanForm] = useState(false);
  const [banUserId, setBanUserId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("7");
  const [loadingLocalization, setLoadingLocalization] = useState(true);

  // Load localization analytics from backend
  useEffect(() => {
    const fetchLocalizationData = async () => {
      try {
        setLoadingLocalization(true);
        const response = await axios.get(`${API}/admin/localization-analytics`);
        if (response.data && response.data.by_language) {
          setLocalizationData(response.data.by_language);
        }
      } catch (error) {
        console.error("Error fetching localization data:", error);
        toast.error("Failed to load localization analytics");
      } finally {
        setLoadingLocalization(false);
      }
    };

    fetchLocalizationData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchLocalizationData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBanUser = () => {
    if (!banUserId.trim() || !banReason.trim()) {
      toast.error("Fill all fields");
      return;
    }

    const ban = {
      id: `ban_${Date.now()}`,
      userId: banUserId,
      username: `User_${banUserId.slice(-4)}`,
      reason: banReason,
      bannedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + parseInt(banDays) * 86400000).toISOString()
    };

    setBannedUsers([ban, ...bannedUsers]);
    setBanUserId("");
    setBanReason("");
    toast.success("User banned!");
    setShowBanForm(false);
  };

  const handleReviewReport = (id) => {
    setReports(reports.map(r =>
      r.id === id ? { ...r, status: "under_review" } : r
    ));
    toast.success("Status updated to Under Review");
  };

  const handleResolveReport = (id) => {
    setReports(reports.map(r =>
      r.id === id ? { ...r, status: "resolved" } : r
    ));
    toast.success("Report resolved");
  };

  const handleUnban = (id) => {
    setBannedUsers(bannedUsers.filter(b => b.id !== id));
    toast.success("User unbanned");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "under_review":
        return "bg-blue-500/20 text-blue-400";
      case "resolved":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getRiskLevel = (reason) => {
    if (["Scam", "Spam", "Money Laundering"].includes(reason)) return "critical";
    if (["Harassment", "Hate Speech"].includes(reason)) return "high";
    return "medium";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AlertCircle size={24} className="text-red-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          Moderation Tools
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "reports"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Flag size={16} className="inline mr-2" />
          Reports ({reports.filter(r => r.status === "pending").length})
        </button>
        <button
          onClick={() => setActiveTab("banned")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "banned"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Ban size={16} className="inline mr-2" />
          Banned Users ({bannedUsers.length})
        </button>
        <button
          onClick={() => setActiveTab("filters")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "filters"
              ? "text-red-400 border-b-2 border-red-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <BarChart3 size={16} className="inline mr-2" />
          Filters
        </button>
        <button
          onClick={() => setActiveTab("localization")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "localization"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Globe size={16} className="inline mr-2" />
          Localization Analytics
        </button>
      </div>

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-gray-400">Reason</th>
                  <th className="px-4 py-3 text-left text-gray-400">Risk</th>
                  <th className="px-4 py-3 text-left text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-gray-400">Reported</th>
                  <th className="px-4 py-3 text-center text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{report.username}</p>
                        <p className="text-xs text-gray-500">{report.userId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white">{report.reason}</p>
                        <p className="text-xs text-gray-400">{report.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          getRiskLevel(report.reason) === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : getRiskLevel(report.reason) === "high"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }
                      >
                        {getRiskLevel(report.reason).toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(report.reportedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {report.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleReviewReport(report.id)}
                              className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded transition"
                            >
                              Review
                            </button>
                            <button
                              onClick={() => handleResolveReport(report.id)}
                              className="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded transition"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Banned Users Tab */}
      {activeTab === "banned" && (
        <div className="space-y-4">
          <Button
            onClick={() => setShowBanForm(!showBanForm)}
            className="bg-red-500/20 hover:bg-red-500/40 text-red-400 h-9"
          >
            <Ban size={16} className="mr-1" />
            Ban User
          </Button>

          {showBanForm && (
            <div className="glass-card p-4 border border-red-500/20 space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">User ID</label>
                <Input
                  value={banUserId}
                  onChange={(e) => setBanUserId(e.target.value)}
                  placeholder="user_123"
                  className="bg-slate-800/50 border-white/10 text-white h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Reason</label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason for ban..."
                  className="bg-slate-800/50 border-white/10 text-white h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Duration (days)</label>
                <Input
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  type="number"
                  placeholder="7"
                  className="bg-slate-800/50 border-white/10 text-white h-8 text-sm"
                  min="1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleBanUser}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 h-8"
                >
                  Confirm Ban
                </Button>
                <Button
                  onClick={() => setShowBanForm(false)}
                  className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 text-gray-300 h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-gray-400">Reason</th>
                  <th className="px-4 py-3 text-left text-gray-400">Banned At</th>
                  <th className="px-4 py-3 text-left text-gray-400">Expires</th>
                  <th className="px-4 py-3 text-center text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {bannedUsers.map((ban) => (
                  <tr key={ban.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{ban.username}</p>
                        <p className="text-xs text-gray-500">{ban.userId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-red-400">{ban.reason}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(ban.bannedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(ban.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleUnban(ban.id)}
                        className="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded transition"
                      >
                        Unban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters Tab (Skeleton) */}
      {activeTab === "filters" && (
        <div className="glass-card p-6 border border-white/10 space-y-4">
          <div className="bg-slate-800/30 p-4 rounded border border-white/10">
            <h3 className="text-white font-semibold mb-3">Chat Filters</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>✓ Auto-detect spam patterns</p>
              <p>✓ Keyword blacklist filtering</p>
              <p>✓ URL/Link detection</p>
              <p className="text-gray-600">→ Coming soon: ML-based toxicity detection</p>
            </div>
          </div>

          <div className="bg-slate-800/30 p-4 rounded border border-white/10">
            <h3 className="text-white font-semibold mb-3">Transaction Monitors</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>✓ Detect rapid fire trades</p>
              <p>✓ Suspicious wallet patterns</p>
              <p>✓ AML compliance checks</p>
              <p className="text-gray-600">→ Coming soon: Blockchain verification</p>
            </div>
          </div>
        </div>
      )}

      {/* Localization Analytics Tab */}
      {activeTab === "localization" && (
        <div className="space-y-6">
          {loadingLocalization ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="glass-card p-4 border border-cyan-500/30 rounded-lg">
                  <div className="text-sm text-gray-400">Total Users</div>
                  <div className="text-2xl font-bold text-cyan-400 mt-2">
                    {Object.values(localizationData).reduce((a, b) => a + b, 0)}
                  </div>
                </div>
                <div className="glass-card p-4 border border-cyan-500/30 rounded-lg">
                  <div className="text-sm text-gray-400">Most Popular</div>
                  <div className="text-2xl font-bold text-green-400 mt-2">
                    {Object.keys(localizationData).reduce((a, b) =>
                      (localizationData[a] || 0) > (localizationData[b] || 0) ? a : b
                    ).toUpperCase()}
                  </div>
                </div>
                <div className="glass-card p-4 border border-cyan-500/30 rounded-lg">
                  <div className="text-sm text-gray-400">Language Diversity</div>
                  <div className="text-2xl font-bold text-purple-400 mt-2">
                    {Object.keys(localizationData).filter(lang => (localizationData[lang] || 0) > 0).length}
                  </div>
                </div>
              </div>

              {/* Language Distribution Chart */}
              <div className="glass-card border border-white/10 p-6 rounded-lg">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Globe size={18} className="text-cyan-400" />
                  Language Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(localizationData)
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .map(([lang, count]) => {
                      const total = Object.values(localizationData).reduce((a, b) => a + (b || 0), 0);
                      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                      const langNames = {
                        en: "English",
                        uk: "Українська",
                        tr: "Türkçe",
                        ru: "Русский",
                        zh: "中文",
                        ar: "العربية",
                        ko: "한국어",
                        ja: "日本語",
                        de: "Deutsch",
                        fr: "Français",
                        th: "ไทย"
                      };

                      return (
                        <div key={lang} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-medium">{langNames[lang] || lang}</span>
                            <span className="text-cyan-400 font-semibold">{count || 0} users ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Notes */}
              <div className="glass-card border border-white/10 p-4 rounded-lg bg-slate-800/30">
                <p className="text-sm text-gray-400">
                  📊 <strong>Language preference tracking:</strong> Data stored in localStorage per user session. 
                  This analytics panel helps understand user localization preferences and can guide feature development priorities.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Moderation;
