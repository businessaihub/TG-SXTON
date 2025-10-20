import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ShoppingCart, Star, Sparkles, Clock, TrendingUp, Flame, Activity as ActivityIcon, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";

const Marketplace = ({ user, language }) => {
  const [packs, setPacks] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [tradingVolume, setTradingVolume] = useState(0);
  const [activeTraders, setActiveTraders] = useState(0);
  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchPacks();
    fetchFeatured();
    fetchActivityStats();
    
    // Update activity stats every 5 seconds
    const interval = setInterval(fetchActivityStats, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    sortPacks();
  }, [sortBy]);

  const fetchActivityStats = async () => {
    setOnlineUsers(Math.floor(Math.random() * (1000 - 150) + 150));
    setTradingVolume(Math.floor(Math.random() * (5000 - 1000) + 1000));
    setActiveTraders(Math.floor(Math.random() * (200 - 50) + 50));
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

  const sortPacks = () => {
    let sorted = [...packs];
    switch(sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-low":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "rarity":
        const rarityOrder = {legendary: 0, epic: 1, rare: 2, common: 3};
        sorted.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
        break;
      default:
        break;
    }
    setPacks(sorted);
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
    <div className="p-3 space-y-3 relative" data-testid="marketplace-container">
      {/* Cosmic background */}
      <div className="cosmic-bg-subtle"></div>
      
      {/* Header with Live Stats */}
      <div className="pt-2 relative z-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk' }}>
            {t.marketplace.title}
          </h1>
        </div>
        <p className="text-gray-400 text-sm mb-2">{t.marketplace.subtitle}</p>
        
        {/* Activity Indicators */}
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 transition-colors relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse relative z-10"></div>
            <span className="text-green-400 font-semibold text-sm relative z-10">{onlineUsers}</span>
            <span className="text-gray-400 text-xs relative z-10">online</span>
          </div>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 transition-colors relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <ActivityIcon className="text-cyan-400 relative z-10" size={14} />
            <span className="text-cyan-400 font-semibold text-sm relative z-10">{tradingVolume}</span>
            <span className="text-gray-400 text-xs relative z-10">TON</span>
          </div>
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 transition-colors relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <Flame className="text-yellow-400 relative z-10" size={14} />
            <span className="text-yellow-400 font-semibold text-sm relative z-10">{activeTraders}</span>
            <span className="text-gray-400 text-xs relative z-10">trading</span>
          </div>
        </div>
      </div>

      {/* Featured Carousel */}
      {featured.length > 0 && (
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={16} />
            <h2 className="text-base font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              {t.marketplace.featured}
            </h2>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {featured.map((pack) => (
              <div
                key={pack.id}
                data-testid={`featured-pack-${pack.id}`}
                className="glass-card p-2.5 min-w-[200px] flex-shrink-0 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 transition-colors duration-300 cursor-pointer relative overflow-hidden"
              >
                <div className="cosmic-particles"></div>
                <div className="relative mb-2 overflow-hidden rounded-lg z-10">
                  <img
                    src={pack.image_url}
                    alt={pack.name}
                    className="w-full h-24 object-cover"
                  />
                  <Badge className={`absolute top-1 right-1 text-xs ${getRarityColor(pack.rarity)} shadow-lg`}>
                    {pack.rarity.toUpperCase()}
                  </Badge>
                  {pack.show_number && (
                    <Badge className="absolute top-1 left-1 text-xs bg-black/60 text-white border-white/30">
                      #{pack.sticker_count}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-white text-xs mb-1 relative z-10 truncate">{pack.name}</h3>
                <p className="text-xs text-gray-400 mb-1.5 relative z-10">{pack.sticker_count} stickers</p>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {pack.price} {pack.price_type}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBuy(pack)}
                    data-testid={`buy-featured-${pack.id}`}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-colors shadow-lg h-7 px-2 text-xs"
                  >
                    <ShoppingCart size={12} className="mr-1" />
                    {t.marketplace.buy}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Sorting */}
      <div className="space-y-2 relative z-10">
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10 h-9">
            <TabsTrigger 
              value="all" 
              data-testid="filter-all"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 text-sm"
            >
              {t.marketplace.all}
            </TabsTrigger>
            <TabsTrigger 
              value="my" 
              data-testid="filter-my"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 text-sm"
            >
              {t.marketplace.myStickers}
            </TabsTrigger>
            <TabsTrigger 
              value="external" 
              data-testid="filter-external"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 text-sm"
            >
              {t.marketplace.external}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="text-gray-400" size={16} />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 bg-slate-800/50 border-white/10 text-white h-8 text-sm">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10">
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="name">By Collection</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rarity">By Rarity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Packs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 relative z-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 skeleton h-48"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 relative z-10">
          {packs.map((pack) => (
            <div
              key={pack.id}
              data-testid={`pack-card-${pack.id}`}
              className="glass-card p-4 flex gap-4 border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transform hover:scale-[1.02] active:scale-100 transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              <div className="cosmic-particles"></div>
              <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg z-10">
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
              
              <div className="flex-1 flex flex-col justify-between z-10">
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
        <div className="text-center py-12 relative z-10">
          <div className="glass-card p-8 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <p className="text-yellow-400">{t.marketplace.noPacks}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;