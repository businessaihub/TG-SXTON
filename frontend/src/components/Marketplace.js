import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { ShoppingCart, Star, Sparkles, Clock, TrendingUp, Flame, Activity as ActivityIcon } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";

const Marketplace = ({ user, language }) => {
  const [packs, setPacks] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [tradingVolume, setTradingVolume] = useState(0);
  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchPacks();
    fetchFeatured();
    fetchActivityStats();
    
    // Update activity stats every 5 seconds
    const interval = setInterval(fetchActivityStats, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchActivityStats = async () => {
    setOnlineUsers(Math.floor(Math.random() * (1000 - 150) + 150));
    setTradingVolume(Math.floor(Math.random() * (5000 - 1000) + 1000));
  };

  const fetchPacks = async () => {
    try {
      const response = await axios.get(`${API}/packs?filter_type=${filter}`);
      setPacks(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching packs:", error);
      setLoading(false);
    }
  };

  const fetchFeatured = async () => {
    try {
      const response = await axios.get(`${API}/packs/featured`);
      setFeatured(response.data);
    } catch (error) {
      console.error("Error fetching featured:", error);
    }
  };

  const handleBuy = async (pack) => {
    if (!user) {
      toast.error(t.marketplace.loginRequired);
      return;
    }

    try {
      await axios.post(`${API}/buy/pack`, {
        user_id: user.id,
        pack_id: pack.id
      });
      toast.success(`${t.marketplace.purchased} ${pack.name}!`, {
        style: {
          background: 'linear-gradient(to right, #10b981, #059669)',
          color: '#fff'
        }
      });
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || t.marketplace.purchaseError, {
        style: {
          background: 'linear-gradient(to right, #ef4444, #dc2626)',
          color: '#fff'
        }
      });
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case "legendary": return "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500";
      case "epic": return "bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500";
      case "rare": return "bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500";
      default: return "bg-gradient-to-r from-gray-500 to-slate-600";
    }
  };

  return (
    <div className="p-4 space-y-6" data-testid="marketplace-container">
      {/* Header with Live Stats */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk' }}>
            {t.marketplace.title}
          </h1>
        </div>
        <p className="text-gray-400 mb-4">{t.marketplace.subtitle}</p>
        
        {/* Activity Indicators */}
        <div className="flex gap-3 mb-4">
          <div className="glass-card px-4 py-2 flex items-center gap-2 border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 transform hover:scale-105 transition-all">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 font-semibold">{onlineUsers}</span>
            <span className="text-gray-400 text-sm">online</span>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-2 border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 transform hover:scale-105 transition-all">
            <ActivityIcon className="text-cyan-400" size={16} />
            <span className="text-cyan-400 font-semibold">{tradingVolume}</span>
            <span className="text-gray-400 text-sm">TON volume</span>
          </div>
        </div>
      </div>

      {/* Featured Carousel */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={20} />
            <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              {t.marketplace.featured}
            </h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {featured.map((pack) => (
              <div
                key={pack.id}
                data-testid={`featured-pack-${pack.id}`}
                className="glass-card p-4 min-w-[280px] flex-shrink-0 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20 active:scale-100 transition-all duration-300 cursor-pointer"
              >
                <div className="relative mb-3 overflow-hidden rounded-lg">
                  <img
                    src={pack.image_url}
                    alt={pack.name}
                    className="w-full h-40 object-cover transition-transform duration-300 hover:scale-110"
                  />
                  <Badge className={`absolute top-2 right-2 ${getRarityColor(pack.rarity)} shadow-lg`}>
                    {pack.rarity.toUpperCase()}
                  </Badge>
                  {pack.show_number && (
                    <Badge className="absolute top-2 left-2 bg-black/60 text-white border-white/30">
                      #{pack.sticker_count}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-white mb-1">{pack.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{pack.sticker_count} stickers</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {pack.price} {pack.price_type}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBuy(pack)}
                    data-testid={`buy-featured-${pack.id}`}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transform hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-cyan-500/50"
                  >
                    <ShoppingCart size={16} className="mr-1" />
                    {t.marketplace.buy}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10">
          <TabsTrigger 
            value="all" 
            data-testid="filter-all"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500"
          >
            {t.marketplace.all}
          </TabsTrigger>
          <TabsTrigger 
            value="my" 
            data-testid="filter-my"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500"
          >
            {t.marketplace.myStickers}
          </TabsTrigger>
          <TabsTrigger 
            value="external" 
            data-testid="filter-external"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500"
          >
            {t.marketplace.external}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Packs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 skeleton h-48"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {packs.map((pack) => (
            <div
              key={pack.id}
              data-testid={`pack-card-${pack.id}`}
              className="glass-card p-4 flex gap-4 border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transform hover:scale-[1.02] active:scale-100 transition-all duration-300 cursor-pointer"
            >
              <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={pack.image_url}
                  alt={pack.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
                {pack.show_number && (
                  <Badge className="absolute -top-1 -right-1 bg-gradient-to-br from-cyan-500 to-blue-500 text-xs shadow-lg">
                    #{pack.sticker_count}
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{pack.name}</h3>
                    <Badge className={`${getRarityColor(pack.rarity)} text-xs shadow-lg`}>
                      {pack.rarity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">{pack.description}</p>
                  {pack.is_upcoming && (
                    <div className="flex items-center gap-1 mt-2 text-sm">
                      <Clock size={14} className="text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">Coming Soon</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {pack.price} {pack.price_type}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBuy(pack)}
                    data-testid={`buy-pack-${pack.id}`}
                    disabled={pack.is_upcoming}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 transform hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-cyan-500/50"
                  >
                    <ShoppingCart size={16} className="mr-1" />
                    {pack.is_upcoming ? "Soon" : t.marketplace.buy}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && packs.length === 0 && (
        <div className="text-center py-12">
          <div className="glass-card p-8 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <p className="text-yellow-400">{t.marketplace.noPacks}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;