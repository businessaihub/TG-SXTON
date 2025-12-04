import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Gift, TrendingUp, DollarSign, CheckCircle, Filter } from "lucide-react";
import { translations } from "../utils/translations";

const Activity = ({ language }) => {
  const [activities, setActivities] = useState([]);
  const [packs, setPacks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchActivity();
    fetchPacks();
    const interval = setInterval(fetchActivity, 10000); // Auto-refresh every 10s
    
    // Listen for analytics mode changes
    const handleAnalyticsUpdate = () => {
      fetchActivity();
    };
    window.addEventListener("analyticsUpdated", handleAnalyticsUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("analyticsUpdated", handleAnalyticsUpdate);
    };
  }, [filter, collectionFilter, timeFilter]);

  const fetchPacks = async () => {
    try {
      const response = await axios.get(`${API}/packs`);
      setPacks(response.data);
    } catch (error) {
      console.error("Error fetching packs:", error);
    }
  };

  const fetchActivity = async () => {
    try {
      const response = await axios.get(`${API}/activity?filter_type=${filter}`);
      let filteredActivities = response.data;

      // Filter by collection
      if (collectionFilter !== "all") {
        filteredActivities = filteredActivities.filter(
          (a) => a.pack_name === collectionFilter
        );
      }

      // Filter by time
      if (timeFilter !== "all") {
        const now = new Date();
        filteredActivities = filteredActivities.filter((a) => {
          const activityDate = new Date(a.created_at);
          const hoursDiff = (now - activityDate) / (1000 * 60 * 60);
          
          if (timeFilter === "1h") return hoursDiff <= 1;
          if (timeFilter === "24h") return hoursDiff <= 24;
          if (timeFilter === "7d") return hoursDiff <= 168;
          return true;
        });
      }

      setActivities(filteredActivities);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching activity:", error);
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "bought": return <ShoppingCart size={18} className="text-cyan-400" />;
      case "opened": return <Gift size={18} className="text-purple-400" />;
      case "burned": return <Flame size={18} className="text-orange-400" />;
      case "listed": return <TrendingUp size={18} className="text-green-400" />;
      case "sold": return <DollarSign size={18} className="text-yellow-400" />;
      default: return <Gift size={18} />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "bought": return "text-cyan-400";
      case "opened": return "text-purple-400";
      case "burned": return "text-orange-400";
      case "listed": return "text-green-400";
      case "sold": return "text-yellow-400";
      default: return "text-gray-400";
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const generatePseudonym = (activityId) => {
    // Generate consistent pseudonym from activity ID
    const hash = activityId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const names = ["Cosmic", "Stellar", "Nebula", "Galaxy", "Astro", "Nova", "Orbit", "Lunar", "Solar", "Quantum"];
    const suffixes = ["Trader", "Collector", "Hunter", "Master", "Pro", "Legend", "Ace", "Elite", "Hero", "Star"];
    const nameIdx = Math.abs(hash) % names.length;
    const suffixIdx = Math.abs(hash >> 4) % suffixes.length;
    return `${names[nameIdx]}${suffixes[suffixIdx]}`;
  };

  return (
    <div className="p-4 space-y-6 relative" data-testid="activity-container">
      <div className="cosmic-bg-subtle"></div>
      
      {/* Header */}
      <div className="pt-4 relative z-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk' }}>
          {t.activity.title}
        </h1>
        <p className="text-gray-400">{t.activity.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="space-y-3 relative z-10">
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10">
            <TabsTrigger 
              value="all" 
              data-testid="activity-filter-all"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500"
            >
              {t.activity.all}
            </TabsTrigger>
            <TabsTrigger 
              value="paid" 
              data-testid="activity-filter-paid"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500"
            >
              {t.activity.paid}
            </TabsTrigger>
            <TabsTrigger 
              value="free" 
              data-testid="activity-filter-free"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500"
            >
              {t.activity.free}
            </TabsTrigger>
            <TabsTrigger 
              value="finished" 
              data-testid="activity-filter-finished"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500"
            >
              {t.activity.finished}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Additional Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={18} />
            <Select value={collectionFilter} onValueChange={setCollectionFilter}>
              <SelectTrigger className="w-48 bg-slate-800/50 border-white/10 text-white">
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="all">All Collections</SelectItem>
                {packs.map((pack) => (
                  <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-white/10 text-white">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <div className="space-y-3 relative z-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 skeleton h-24"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          {activities.map((activity) => (
            <div
              key={activity.id}
              data-testid={`activity-item-${activity.id}`}
              className="glass-card p-4 relative overflow-hidden hover:scale-[1.01] transition-all"
            >
              <div className="cosmic-particles"></div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(activity.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold text-white">{activity.pack_name}</span>
                    <span className="text-gray-500">•</span>
                    <span className={`${getActionColor(activity.action)} font-medium capitalize`}>
                      {activity.action}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm text-gray-400">
                      by <span className="text-purple-400 font-medium">{generatePseudonym(activity.id)}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {activity.is_free ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Free
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                          {typeof activity.price === 'number' ? activity.price.toFixed(2) : activity.price} {activity.price_type}
                        </span>
                      </div>
                    )}
                    {activity.is_simulation && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs border-purple-500/30">
                        Demo
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm text-gray-400">
                    {formatTimestamp(activity.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-center py-12 relative z-10">
          <div className="glass-card p-8 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <p className="text-yellow-400">{t.activity.noActivity}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const ShoppingCart = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const Flame = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);

export default Activity;