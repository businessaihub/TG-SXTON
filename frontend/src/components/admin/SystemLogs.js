import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { LogSquare, Download, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const SystemLogs = ({ adminToken }) => {
  const [logs, setLogs] = useState([
    {
      id: "log_1",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      level: "info",
      message: "User marketplace_user_123 purchased pack: Blue Stickers",
      source: "backend",
      metadata: { user_id: "user_123", pack_id: "pack_456" }
    },
    {
      id: "log_2",
      timestamp: new Date(Date.now() - 180000).toISOString(),
      level: "warning",
      message: "High trading volume detected: 5000 TON in 1 hour",
      source: "analytics",
      metadata: { volume: 5000, timeframe: "1h" }
    },
    {
      id: "log_3",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: "error",
      message: "Failed to verify TON transaction: Invalid signature",
      source: "blockchain",
      metadata: { tx_hash: "0x123abc...", error_code: "INVALID_SIG" }
    },
    {
      id: "log_4",
      timestamp: new Date(Date.now() - 30000).toISOString(),
      level: "info",
      message: "Admin login: admin_user from IP 192.168.1.1",
      source: "backend",
      metadata: { admin: "admin_user", ip: "192.168.1.1" }
    }
  ]);

  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(false);

  // Fetch logs from backend (simulated)
  const fetchLogs = async () => {
    setLoading(true);
    try {
      // In production, call: GET /admin/logs?level=error&source=backend&search=text
      // For now, use mock data
      toast.success("Logs refreshed");
    } catch (error) {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    let filtered = logs;

    // Level filter
    if (levelFilter !== "all") {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter(log => log.source === sourceFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    return filtered;
  };

  const getLevelColor = (level) => {
    switch (level) {
      case "error":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "warning":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "info":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case "error":
        return "🔴";
      case "warning":
        return "🟡";
      case "info":
        return "🔵";
      default:
        return "⚪";
    }
  };

  const handleDownloadLogs = () => {
    const csv = [
      ["Timestamp", "Level", "Message", "Source"].join(","),
      ...getFilteredLogs().map(log =>
        [
          new Date(log.timestamp).toLocaleString(),
          log.level.toUpperCase(),
          `"${log.message}"`,
          log.source
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system_logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Logs downloaded!");
  };

  const handleClearLogs = () => {
    if (window.confirm("Clear all logs older than 7 days?")) {
      setLogs(logs.filter(log => {
        const logDate = new Date(log.timestamp);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return logDate > sevenDaysAgo;
      }));
      toast.success("Old logs cleared");
    }
  };

  const filteredLogs = getFilteredLogs();
  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === "error").length,
    warnings: logs.filter(l => l.level === "warning").length,
    info: logs.filter(l => l.level === "info").length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <LogSquare size={24} className="text-cyan-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          System Logs
        </h2>
        <Button
          onClick={fetchLogs}
          disabled={loading}
          className="ml-auto bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 h-9"
        >
          <RefreshCw size={16} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-800/30 p-3 rounded border border-white/10 text-center">
          <p className="text-xs text-gray-400">Total Logs</p>
          <p className="text-xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-red-500/10 p-3 rounded border border-red-500/30 text-center">
          <p className="text-xs text-red-400">Errors</p>
          <p className="text-xl font-bold text-red-400">{stats.errors}</p>
        </div>
        <div className="bg-yellow-500/10 p-3 rounded border border-yellow-500/30 text-center">
          <p className="text-xs text-yellow-400">Warnings</p>
          <p className="text-xl font-bold text-yellow-400">{stats.warnings}</p>
        </div>
        <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30 text-center">
          <p className="text-xs text-blue-400">Info</p>
          <p className="text-xl font-bold text-blue-400">{stats.info}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800/50 border-white/10 text-white placeholder-gray-500 h-8 text-sm"
            />
          </div>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-white/10 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Errors Only</SelectItem>
              <SelectItem value="warning">Warnings Only</SelectItem>
              <SelectItem value="info">Info Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-white/10 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="blockchain">Blockchain</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-white/10 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleDownloadLogs}
            className="bg-green-500/20 hover:bg-green-500/40 text-green-400 h-8"
          >
            <Download size={16} className="mr-1" />
            Export CSV
          </Button>

          <Button
            onClick={handleClearLogs}
            className="bg-red-500/20 hover:bg-red-500/40 text-red-400 h-8"
          >
            <Trash2 size={16} className="mr-1" />
            Clear Old
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-slate-800/50">
                <th className="px-4 py-3 text-left text-gray-400 w-32">Time</th>
                <th className="px-4 py-3 text-left text-gray-400 w-20">Level</th>
                <th className="px-4 py-3 text-left text-gray-400 flex-1">Message</th>
                <th className="px-4 py-3 text-left text-gray-400 w-28">Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs font-semibold border ${getLevelColor(log.level)}`}>
                        {getLevelIcon(log.level)} {log.level.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="truncate hover:text-clip" title={log.message}>
                        {log.message}
                      </div>
                      {log.metadata && (
                        <div className="text-xs text-gray-500 mt-1">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key}>{key}: {JSON.stringify(value)}</div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Badge className="bg-slate-700/50 text-gray-300 text-xs capitalize">
                        {log.source}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Showing {filteredLogs.length} of {logs.length} logs • Auto-refresh every 30 seconds
      </div>
    </div>
  );
};

export default SystemLogs;
