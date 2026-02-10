import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { AlertCircle, Ban, Eye, BarChart3, MessageSquareX, Flag } from "lucide-react";
import { toast } from "sonner";

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

  const [showBanForm, setShowBanForm] = useState(false);
  const [banUserId, setBanUserId] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("7");

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
    </div>
  );
};

export default Moderation;
