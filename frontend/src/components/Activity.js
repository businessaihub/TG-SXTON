import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Gift, TrendingUp, DollarSign, Filter, Package, Share2, Star, Sparkles } from "lucide-react";
import { translations } from "../utils/translations";
import { toast } from "sonner";

const getRarityColor = (rarity) => {
  switch (rarity?.toLowerCase()) {
    case 'legendary': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
    case 'epic': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
    case 'rare': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    case 'uncommon': return 'bg-green-500/80 text-white';
    default: return 'bg-gray-500/80 text-white';
  }
};

const Activity = ({ language, user, deepLinkStickerId, onDeepLinkHandled }) => {
  const [activities, setActivities] = useState([]);
  const [packs, setPacks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [buyingIds, setBuyingIds] = useState({});
  // User Listings state
  const [resaleListings, setResaleListings] = useState([]);
  const [loadingResale, setLoadingResale] = useState(false);
  const [buyingStickerIds, setBuyingStickerIds] = useState({});
  const [previewSticker, setPreviewSticker] = useState(null);
  const t = translations[language] || translations.en;

  useEffect(() => {
    if (filter === "listings") return; // listings tab has its own fetch
    fetchActivity();
    fetchPacks();
    const interval = setInterval(fetchActivity, 10000);
    
    const handleAnalyticsUpdate = () => {
      fetchActivity();
    };
    window.addEventListener("analyticsUpdated", handleAnalyticsUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("analyticsUpdated", handleAnalyticsUpdate);
    };
  }, [filter, collectionFilter, timeFilter]);

  // Fetch resale listings when Listings tab is active
  useEffect(() => {
    if (filter === "listings") {
      fetchResaleListings();
    }
  }, [filter]);

  // Deep link: auto-open sticker preview
  useEffect(() => {
    if (!deepLinkStickerId) return;
    const fetchDeepLinkSticker = async () => {
      try {
        const res = await axios.get(`${API}/sticker/${deepLinkStickerId}`);
        if (res.data) {
          setPreviewSticker(res.data);
          setFilter("listings");
        }
      } catch (e) {
        console.error("Deep link sticker not found", e);
      } finally {
        onDeepLinkHandled?.();
      }
    };
    fetchDeepLinkSticker();
  }, [deepLinkStickerId]);

  const fetchResaleListings = async () => {
    setLoadingResale(true);
    try {
      const res = await axios.get(`${API}/marketplace/listings`);
      setResaleListings(res.data || []);
    } catch (e) {
      console.error('Failed to fetch resale listings', e);
    } finally {
      setLoadingResale(false);
    }
  };

  const handleBuySticker = async (sticker) => {
    if (!user?.id) { toast.error("Please login first"); return; }
    if (sticker.owner_id === user.id) { toast.error("Can't buy your own sticker"); return; }
    setBuyingStickerIds(prev => ({ ...prev, [sticker.id]: true }));
    try {
      const res = await axios.post(`${API}/buy/sticker?sticker_id=${sticker.id}&buyer_id=${user.id}`);
      toast.success(res.data.message || "Sticker purchased!");
      fetchResaleListings();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Purchase failed");
    } finally {
      setBuyingStickerIds(prev => ({ ...prev, [sticker.id]: false }));
    }
  };

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

  const handleBuyFromActivity = async (activity) => {
    if (!user?.id) { toast.error("Please login first"); return; }
    if (!activity.sticker_id) { toast.error("Sticker info not available"); return; }
    setBuyingIds(prev => ({ ...prev, [activity.id]: true }));
    try {
      const res = await axios.post(`${API}/buy/sticker?sticker_id=${activity.sticker_id}&buyer_id=${user.id}`);
      toast.success(res.data.message || "Sticker purchased!");
      fetchActivity();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Purchase failed");
    } finally {
      setBuyingIds(prev => ({ ...prev, [activity.id]: false }));
    }
  };

  return (
    <div className="space-y-4 relative" data-testid="activity-container">
      <div className="cosmic-bg-subtle"></div>
      
      {/* Header */}
      <div className="pt-2 relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk' }}>
          {t.activity.title}
        </h1>
        <p className="text-sm text-gray-400">{t.activity.subtitle}</p>
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
              value="listings" 
              data-testid="activity-filter-listings"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500"
            >
              Listings
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

        {/* Additional Filters (hidden on listings tab) */}
        {filter !== "listings" && (
        <div className="flex gap-2 items-center">
          <Select value={collectionFilter} onValueChange={setCollectionFilter}>
            <SelectTrigger className="flex-1 min-w-0 bg-slate-800/50 border-white/10 text-white h-8 text-xs">
              <SelectValue placeholder="Collection" />
            </SelectTrigger>
              <SelectContent className="glass-card border-white/10">
                <SelectItem value="all">All Collections</SelectItem>
                {packs.map((pack) => (
                  <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-28 flex-shrink-0 bg-slate-800/50 border-white/10 text-white h-8 text-xs">
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
        )}
      </div>

      {/* ═══════ LISTINGS TAB ═══════ */}
      {filter === "listings" && (
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-green-400" />
            <h2 className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>For Sale</h2>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              {resaleListings.length} for sale
            </Badge>
          </div>
          {loadingResale ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading listings...</div>
          ) : resaleListings.length === 0 ? (
            <div className="glass-card p-6 text-center border border-white/10">
              <Package size={32} className="mx-auto mb-2 text-gray-500 opacity-40" />
              <p className="text-gray-400 text-sm">No stickers listed for sale yet</p>
              <p className="text-[10px] text-gray-500 mt-1">List your stickers from Profile → Stickers tab</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {resaleListings.map((st) => (
                <div
                  key={st.id}
                  className="glass-card border border-green-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg overflow-hidden hover:border-green-500/50 transition-colors cursor-pointer"
                  onClick={() => setPreviewSticker(st)}
                >
                  <div className="relative w-full aspect-square overflow-hidden bg-slate-700">
                    {st.image_url ? (
                      <img src={st.image_url} alt={st.pack_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Package size={32} />
                      </div>
                    )}
                    <Badge className={`absolute top-1 left-1 text-[8px] leading-tight px-1 py-0 ${getRarityColor(st.rarity)}`}>
                      {st.rarity?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-2">
                    <div className="text-[11px] font-semibold text-white truncate">{st.pack_name}</div>
                    <div className="text-[9px] text-gray-400">#{st.sticker_number}</div>
                    <div className="mt-1.5">
                      <Button
                        size="sm"
                        disabled={buyingStickerIds[st.id] || st.owner_id === user?.id}
                        onClick={(e) => { e.stopPropagation(); handleBuySticker(st); }}
                        className={`w-full h-7 text-[10px] ${
                          st.owner_id === user?.id
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                        }`}
                      >
                        {buyingStickerIds[st.id] ? "..." : st.owner_id === user?.id ? "Yours" : `${st.price?.toFixed(2)} TON`}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Feed (hidden on listings tab) */}
      {filter !== "listings" && loading ? (
        <div className="space-y-3 relative z-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 skeleton h-24"></div>
          ))}
        </div>
      ) : filter !== "listings" ? (
        <div className="space-y-3 relative z-10">
          {activities.map((activity) => (
            <div
              key={activity.id}
              data-testid={`activity-item-${activity.id}`}
              className="glass-card p-3 relative overflow-hidden hover:scale-[1.01] transition-all"
            >
              <div className="cosmic-particles"></div>
              <div className="flex items-start gap-3 relative z-10">
                {/* Sticker Image */}
                <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                  {activity.image_url ? (
                    <img src={activity.image_url} alt={activity.pack_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <Package size={20} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {getActionIcon(activity.action)}
                    <span className="font-semibold text-white text-sm">{activity.pack_name}</span>
                    <span className={`${getActionColor(activity.action)} font-medium capitalize text-xs`}>
                      {activity.action}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {activity.is_free ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                        Free
                      </Badge>
                    ) : (
                      <span className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {typeof activity.price === 'number' ? activity.price.toFixed(2) : activity.price} {activity.price_type}
                      </span>
                    )}
                    {activity.is_simulation && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-[10px] border-purple-500/30">
                        Demo
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="text-[11px] text-gray-400">
                    {formatTimestamp(activity.created_at)}
                  </div>
                  {activity.action === "listed" && activity.sticker_id && (
                    <Button
                      size="sm"
                      disabled={buyingIds[activity.id]}
                      onClick={() => handleBuyFromActivity(activity)}
                      className="h-6 text-[10px] px-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                      {buyingIds[activity.id] ? "..." : "Buy"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {filter !== "listings" && !loading && activities.length === 0 && (
        <div className="text-center py-12 relative z-10">
          <div className="glass-card p-8 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <p className="text-yellow-400">{t.activity.noActivity}</p>
          </div>
        </div>
      )}

      {/* ═══════ STICKER PREVIEW MODAL ═══════ */}
      {previewSticker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-end justify-center" onClick={() => setPreviewSticker(null)}>
          <div
            className="bg-[#0d0d1a] border-t border-white/10 rounded-t-3xl w-full max-w-md overflow-hidden"
            style={{ animation: "slideUp 0.3s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-gray-600" />
            </div>

            {/* Image area with floating action icons */}
            <div className="relative px-8 py-6">
              {/* Floating action icons - top right */}
              <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-20">
                <div
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg"
                  title={previewSticker.rarity || "Rarity"}
                >
                  <Star size={18} className="text-yellow-400" />
                </div>
                <button
                  onClick={async () => {
                    const deepLink = `https://t.me/stickersxton_bot?startapp=sticker_${previewSticker.id}`;
                    const text = `Check out this sticker: ${previewSticker.pack_name} #${previewSticker.sticker_number} — ${previewSticker.price?.toFixed(2)} TON`;
                    const tg = window.Telegram?.WebApp;
                    if (tg?.openTelegramLink) {
                      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(deepLink)}&text=${encodeURIComponent(text)}`);
                    } else {
                      try {
                        await navigator.clipboard.writeText(`${text} ${deepLink}`);
                        toast.success("Link copied!");
                      } catch (err) {
                        toast.error("Failed to share");
                      }
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all shadow-lg"
                  title="Send"
                >
                  <Share2 size={18} className="text-blue-400" />
                </button>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-48 h-48 rounded-2xl overflow-hidden bg-slate-800/30 border border-white/5 flex-shrink-0">
                  {previewSticker.image_url ? (
                    <img src={previewSticker.image_url} alt={previewSticker.pack_name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <Package size={56} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Collection row */}
            <div className="flex items-center justify-center gap-2 px-4">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {previewSticker.image_url ? (
                  <img src={previewSticker.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={12} className="text-white" />
                )}
              </div>
              <span className="text-sm text-gray-300 font-medium">{previewSticker.pack_name}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" fill="#3390EC" />
                <path d="M9.5 12.5L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Sticker info */}
            <div className="text-center px-4 pt-3 pb-1">
              <h3 className="text-lg font-bold text-white">{previewSticker.pack_name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">#{previewSticker.sticker_number}</p>
            </div>

            {/* Description */}
            <div className="px-5 pt-2 pb-3">
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                {previewSticker.rarity} sticker from the {previewSticker.pack_name} collection.
              </p>
            </div>

            {/* Buy button */}
            <div className="px-5 pb-5">
              <button
                disabled={buyingStickerIds[previewSticker.id] || previewSticker.owner_id === user?.id}
                onClick={() => { handleBuySticker(previewSticker); setPreviewSticker(null); }}
                className={`w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  previewSticker.owner_id === user?.id
                    ? "bg-gray-700/50 text-gray-400 cursor-not-allowed border border-white/5"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20"
                }`}
              >
                {buyingStickerIds[previewSticker.id] ? (
                  <Sparkles size={16} className="animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {buyingStickerIds[previewSticker.id] ? "Processing..." : previewSticker.owner_id === user?.id ? "This is yours" : `Buy for ${previewSticker.price?.toFixed(2)} TON`}
              </button>
            </div>
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