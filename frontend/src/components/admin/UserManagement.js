import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Users, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const UserManagement = ({ adminToken }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API}/admin/users?skip=${currentPage * pageSize}&limit=${pageSize}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      setUsers(response.data.users);
      setTotalUsers(response.data.total);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.telegram_id?.includes(searchQuery)
  );

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <Users size={24} className="text-cyan-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          User Management
        </h2>
        <Badge className="bg-cyan-500/20 text-cyan-400 ml-auto">
          Total: {totalUsers}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-gray-500" />
        <Input
          placeholder="Search by username or Telegram ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800/50 border-white/10 text-white placeholder-gray-500"
        />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading users...</div>
      ) : (
        <>
          <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-gray-400">Username</th>
                  <th className="px-4 py-3 text-left text-gray-400">Telegram ID</th>
                  <th className="px-4 py-3 text-right text-gray-400">Balance</th>
                  <th className="px-4 py-3 text-right text-gray-400">Stickers</th>
                  <th className="px-4 py-3 text-left text-gray-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white font-semibold">{user.username}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{user.telegram_id}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-purple-400 font-semibold">{user.sxton_balance}</span>
                        <span className="text-gray-500 text-xs ml-1">SXTON</span>
                      </td>
                      <td className="px-4 py-3 text-right text-cyan-400 font-semibold">{user.stickers_owned}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-white/10">
            <span className="text-sm text-gray-400">
              Page {currentPage + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="bg-blue-500/20 hover:bg-blue-500/40 h-8 px-3 text-sm"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="bg-blue-500/20 hover:bg-blue-500/40 h-8 px-3 text-sm"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserManagement;
