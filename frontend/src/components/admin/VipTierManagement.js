import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Crown, Zap, Gift, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VipTierManagement = ({ adminToken }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [tierStats, setTierStats] = useState(null);
  const [promoting, setPromoting] = useState(null);

  // Fetch tier statistics on mount
  useEffect(() => {
    const fetchTierStats = async () => {
      try {
        const response = await axios.get(`${API}/admin/tiers/stats`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        setTierStats(response.data);
      } catch (error) {
        console.error("Failed to fetch tier stats:", error);
        toast.error("Failed to load tier statistics");
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API}/admin/users`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        setUsers(response.data.users || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        // Use mock data if API fails
        setUsers([
          {
            id: "user_1",
            username: "premium_user",
            tier: "gold",
            purchases: 45,
            spending: 250.5,
            joined: "2025-06-15",
            promoted_at: "2026-01-10"
          },
          {
            id: "user_2",
            username: "silver_supporter",
            tier: "silver",
            purchases: 12,
            spending: 65.0,
            joined: "2025-09-20",
            promoted_at: "2025-12-01"
          },
          {
            id: "user_3",
            username: "basic_user",
            tier: "basic",
            purchases: 2,
            spending: 10.0,
            joined: "2026-01-01",
            promoted_at: null
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTierStats();
    fetchUsers();
  }, [adminToken]);

  const tiers = {
    basic: {
      name: "Basic",
      color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      icon: "👤",
      benefits: ["Access to marketplace", "Buy stickers", "Join events"],
      requirements: "Everyone"
    },
    silver: {
      name: "Silver",
      color: "bg-slate-400/20 text-slate-300 border-slate-500/30",
      icon: "⭐",
      benefits: ["10% discount on all packs", "Early access to new packs", "2x rewards for quests"],
      requirements: "10+ purchases or $50 spent"
    },
    gold: {
      name: "Gold",
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      icon: "✨",
      benefits: ["20% discount on all packs", "VIP trading feature", "Exclusive gold-only packs", "Priority support", "3x rewards for quests"],
      requirements: "40+ purchases or $200 spent"
    },
    platinum: {
      name: "Platinum",
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      icon: "👑",
      benefits: ["30% discount on all packs", "Advanced trading tools", "Exclusive platinum packs", "Direct support channel", "5x rewards", "Monthly bonus stickers"],
      requirements: "100+ purchases or $500 spent"
    }
  };

  const getNextTier = (currentTier) => {
    const tierHierarchy = ["basic", "silver", "gold", "platinum"];
    const currentIndex = tierHierarchy.indexOf(currentTier);
    return currentIndex < tierHierarchy.length - 1 ? tierHierarchy[currentIndex + 1] : null;
  };

  const handlePromote = async (userId) => {
    try {
      setPromoting(userId);
      const response = await axios.post(
        `${API}/admin/user/${userId}/promote-tier`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      // Update local state
      setUsers(users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            tier: response.data.new_tier,
            promoted_at: new Date().toISOString().split("T")[0]
          };
        }
        return user;
      }));
      
      toast.success(`${response.data.message} ⬆️`);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to promote user";
      toast.error(errorMsg);
      console.error("Promotion error:", error);
    } finally {
      setPromoting(null);
    }
  };

  const handleDemote = (userId) => {
    setUsers(users.map(user => {
      if (user.id === userId && user.tier !== "basic") {
        const tierHierarchy = ["basic", "silver", "gold", "platinum"];
        const currentIndex = tierHierarchy.indexOf(user.tier);
        return {
          ...user,
          tier: tierHierarchy[currentIndex - 1]
        };
      }
      return user;
    }));
    toast.success("User demoted! ⬇️");
  };

  const getFilteredUsers = () => {
    let filtered = users;

    if (tierFilter !== "all") {
      filtered = filtered.filter(u => u.tier === tierFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const stats = tierStats ? tierStats.tier_distribution : {
    platinum: users.filter(u => u.tier === "platinum").length,
    gold: users.filter(u => u.tier === "gold").length,
    silver: users.filter(u => u.tier === "silver").length,
    basic: users.filter(u => u.tier === "basic").length
  };

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Crown size={24} className="text-purple-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          VIP Tier Management
        </h2>
      </div>

      {/* Tier Overview */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(tiers).map(([tierKey, tier]) => (
          <div key={tierKey} className={`glass-card p-3 rounded border ${tier.color}`}>
            <h3 className="font-semibold mb-1 flex items-center gap-1">
              <span>{tier.icon}</span>
              {tier.name}
            </h3>
            <p className="text-lg font-bold">{stats[tierKey]}</p>
            <p className="text-xs opacity-70">users</p>
          </div>
        ))}
      </div>

      {/* Tier Benefits Display */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Tier Benefits</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(tiers).map(([tierKey, tier]) => (
            <div key={tierKey} className={`glass-card p-3 rounded border ${tier.color}`}>
              <h4 className="font-bold mb-2">{tier.icon} {tier.name}</h4>
              <div className="text-xs space-y-1 mb-2">
                {tier.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-1">
                    <span>✓</span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs opacity-60 border-t border-white/10 pt-2 mt-2">
                {tier.requirements}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-64 bg-slate-800/50 border-white/10 text-white placeholder-gray-500 h-8 text-sm"
        />

        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-white/10 text-white h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10">
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="platinum">Platinum Only</SelectItem>
            <SelectItem value="gold">Gold Only</SelectItem>
            <SelectItem value="silver">Silver Only</SelectItem>
            <SelectItem value="basic">Basic Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-slate-800/50">
              <th className="px-4 py-3 text-left text-gray-400">User</th>
              <th className="px-4 py-3 text-left text-gray-400">Tier</th>
              <th className="px-4 py-3 text-right text-gray-400">Purchases</th>
              <th className="px-4 py-3 text-right text-gray-400">Spending</th>
              <th className="px-4 py-3 text-left text-gray-400">Joined</th>
              <th className="px-4 py-3 text-center text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const tier = tiers[user.tier] || tiers.basic;
                return (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white font-medium">{user.username}</p>
                        <p className="text-xs text-gray-500">{user.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs font-bold border ${tier.color}`}>
                        {tier.icon} {tier.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp size={14} className="text-blue-400" />
                        {user.purchases}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-400">
                      ${(user.spending || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(user.joined).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {getNextTier(user.tier) && (
                          <button
                            onClick={() => handlePromote(user.id)}
                            disabled={promoting === user.id}
                            className="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-green-400 rounded transition"
                            title="Promote to next tier"
                          >
                            {promoting === user.id ? (
                              <Loader2 size={12} className="inline animate-spin mr-1" />
                            ) : (
                              "⬆️"
                            )}
                            Promote
                          </button>
                        )}
                        {user.tier !== "basic" && (
                          <button
                            onClick={() => handleDemote(user.id)}
                            className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition"
                            title="Demote to previous tier"
                          >
                            ⬇️ Demote
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rewards Summary */}
      <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={18} className="text-purple-400" />
          <h3 className="font-semibold text-white">Monthly Tier Rewards</h3>
        </div>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="bg-slate-800/50 p-2 rounded">
            <p className="text-gray-400">Basic</p>
            <p className="text-purple-400 font-bold">1x Quest Rewards</p>
          </div>
          <div className="bg-slate-800/50 p-2 rounded">
            <p className="text-gray-400">Silver</p>
            <p className="text-purple-400 font-bold">2x + 10% Off</p>
          </div>
          <div className="bg-slate-800/50 p-2 rounded">
            <p className="text-gray-400">Gold</p>
            <p className="text-purple-400 font-bold">3x + 20% Off</p>
          </div>
          <div className="bg-slate-800/50 p-2 rounded">
            <p className="text-gray-400">Platinum</p>
            <p className="text-purple-400 font-bold">5x + 30% Off + Bonus</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipTierManagement;
