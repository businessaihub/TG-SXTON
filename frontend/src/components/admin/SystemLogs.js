import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Trash2, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [page, setPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  const LOGS_PER_PAGE = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/admin/logs?level=${filterLevel}&source=${filterSource}&skip=${page * LOGS_PER_PAGE}&limit=${LOGS_PER_PAGE}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.total || 0);
    } catch (error) {
      console.error("Failed to fetch logs", error);
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterLevel, filterSource, page]);

  const handleClearOldLogs = async () => {
    if (!confirm("Clear logs older than 7 days?")) return;
    try {
      const res = await axios.post(
        `${API}/admin/logs/clear?days=7`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          },
        }
      );
      toast.success(`Deleted ${res.data.deleted_count} old logs`);
      fetchLogs();
    } catch (error) {
      toast.error("Failed to clear logs");
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case "error":
        return "bg-red-500/20 text-red-400";
      case "warning":
        return "bg-yellow-500/20 text-yellow-400";
      case "info":
        return "bg-blue-500/20 text-blue-400";
      case "debug":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const getSourceColor = (source) => {
    switch (source) {
      case "backend":
        return "bg-purple-500/20 text-purple-400";
      case "frontend":
        return "bg-cyan-500/20 text-cyan-400";
      case "analytics":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  const totalPages = Math.ceil(totalLogs / LOGS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={28} className="text-cyan-400" />
          <h1 className="text-3xl font-bold neon-cyan" style={{ fontFamily: 'Space Grotesk' }}>
            System Logs
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button onClick={handleClearOldLogs} variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10">
            <Trash2 size={16} className="mr-2" />
            Clear Old Logs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap glass-card p-4 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-gray-400 mb-1 block">Level</label>
          <Select value={filterLevel} onValueChange={(value) => { setPage(0); setFilterLevel(value); }}>
            <SelectTrigger className="glass-card border-white/10">
              <SelectValue placeholder={filterLevel === "all" ? "All Levels" : filterLevel} />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-gray-900 z-50" sideOffset={4}>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-gray-400 mb-1 block">Source</label>
          <Select value={filterSource} onValueChange={(value) => { setPage(0); setFilterSource(value); }}>
            <SelectTrigger className="glass-card border-white/10">
              <SelectValue placeholder={filterSource === "all" ? "All Sources" : filterSource} />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-gray-900 z-50" sideOffset={4}>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="blockchain">Blockchain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card p-6 rounded-lg border border-white/10 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No logs found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="text-left py-3 px-4">Timestamp</th>
                  <th className="text-left py-3 px-4">Level</th>
                  <th className="text-left py-3 px-4">Source</th>
                  <th className="text-left py-3 px-4">Message</th>
                  <th className="text-left py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getLevelColor(log.level)}>
                        {log.level.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getSourceColor(log.source)}>
                        {log.source}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{log.message}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-cyan-400">View</summary>
                          <pre className="mt-2 bg-black/50 p-2 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
              <div className="text-sm text-gray-400">
                Showing {page * LOGS_PER_PAGE + 1} to{" "}
                {Math.min((page + 1) * LOGS_PER_PAGE, totalLogs)} of {totalLogs} logs
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <div className="flex items-center px-3 py-2 text-sm text-gray-400">
                  Page {page + 1} of {totalPages}
                </div>
                <Button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
