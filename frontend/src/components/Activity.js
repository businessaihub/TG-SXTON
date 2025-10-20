import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Gift, TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import { translations } from "../utils/translations";

const Activity = ({ language }) => {
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [filter]);

  const fetchActivity = async () => {
    try {
      const response = await axios.get(`${API}/activity?filter_type=${filter}`);
      setActivities(response.data);
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

  return (
    <div className="p-4 space-y-6" data-testid="activity-container">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-4xl font-bold neon-cyan mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          {t.activity.title}
        </h1>
        <p className="text-gray-400">{t.activity.subtitle}</p>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/5">
          <TabsTrigger value="all" data-testid="activity-filter-all">{t.activity.all}</TabsTrigger>
          <TabsTrigger value="paid" data-testid="activity-filter-paid">{t.activity.paid}</TabsTrigger>
          <TabsTrigger value="free" data-testid="activity-filter-free">{t.activity.free}</TabsTrigger>
          <TabsTrigger value="finished" data-testid="activity-filter-finished">{t.activity.finished}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Activity Feed */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 skeleton h-20"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              data-testid={`activity-item-${activity.id}`}
              className="glass-card p-4 flex items-center gap-4"
            >
              <div className="flex-shrink-0">
                {getActionIcon(activity.action)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Gift size={16} className="text-gray-400" />
                  <span className="font-medium">{activity.pack_name}</span>
                  <span className="text-gray-400">—</span>
                  <span className={getActionColor(activity.action)}>
                    {activity.action}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  {activity.is_free ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Free
                    </Badge>
                  ) : (
                    <span className="text-sm text-cyan-400 font-semibold">
                      {activity.price} {activity.price_type}
                    </span>
                  )}
                  {activity.is_simulation && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                      Simulated
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                {new Date(activity.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activities.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>{t.activity.noActivity}</p>
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