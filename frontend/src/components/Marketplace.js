import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ShoppingCart, Star, Sparkles, Clock, TrendingUp, Flame, Activity as ActivityIcon, ArrowUpDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";
import { useTonConnect } from "../context/TonConnectContext";

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='300' height='200' fill='%23667eea'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20' fill='white' font-weight='bold'%3ESticker Pack%3C/text%3E%3Ctext x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23ddd'%3ENo Image%3C/text%3E%3C/svg%3E";

const Marketplace = ({ user, language }) => {
  const { wallet, connectWallet, sendTransaction, isConnecting } = useTonConnect();
  const [packs, setPacks] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [banners, setBanners] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const [buyingPackId, setBuyingPackId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [tradingVolume, setTradingVolume] = useState(0);
  const [activeTraders, setActiveTraders] = useState(0);
  const [transactions, setTransactions] = useState(0);
  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchPacks();
    fetchFeatured();
    fetchBanners();
    fetchActivityStats();
    
    // Update activity stats every 5 seconds
    const interval = setInterval(fetchActivityStats, 5000);
    
    // Listen for analytics updates from admin panel
    const handleAnalyticsUpdated = () => {
      console.log("Analytics updated event received, refreshing stats...");
      fetchActivityStats();
    };
    
    window.addEventListener("analyticsUpdated", handleAnalyticsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("analyticsUpdated", handleAnalyticsUpdated);
    };
  }, [filter]);

  useEffect(() => {
    sortPacks();
  }, [sortBy]);

  const fetchActivityStats = async () => {
    try {
      // Check if we should use real data from admin analytics
      // Default to true (Real Data mode) if not explicitly set
      const savedMode = localStorage.getItem("analytics_use_real_data");
      const useRealData = savedMode === null ? true : savedMode === "true";
      
      if (useRealData) {
        // Fetch real data from public analytics endpoint
        try {
          const response = await axios.get(`${API}/analytics`);
          const data = response.data;
          console.log("Fetched real analytics data:", data);
          
          setOnlineUsers(data.online_users || 0);
          setTradingVolume(data.trading_volume || 0);
          setActiveTraders(data.active_traders || 0);
          setTransactions(data.total_transactions || 0);
        } catch (error) {
          console.error("Error fetching real analytics, falling back to simulation:", error);
          // Fallback to simulation if real data fails
          simulateActivityStats();
        }
      } else {
        // Use simulated data in manual mode
        simulateActivityStats();
      }
    } catch (error) {
      console.error("Error in fetchActivityStats:", error);
      simulateActivityStats();
    }
  };

  const simulateActivityStats = () => {
    setOnlineUsers(Math.floor(Math.random() * (1000 - 150) + 150));
    setTradingVolume(Math.floor(Math.random() * (5000 - 1000) + 1000));
    setActiveTraders(Math.floor(Math.random() * (200 - 50) + 50));
    setTransactions(Math.floor(Math.random() * (1000 - 100) + 100));
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

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/banners`);
      // Filter only active banners and sort by position
      const activeBanners = response.data.filter(b => b.is_active).sort((a, b) => a.position - b.position);
      setBanners(activeBanners);
    } catch (error) {
      console.error("Error fetching banners:", error);
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

    // Check if wallet is connected
    if (!wallet) {
      toast.info("🔗 Connecting TON wallet...");
      await connectWallet();
      return;
    }

    setBuyingPackId(pack.id);

    try {
      // Create transaction payload
      const commentText = `pack:${pack.id}:${user.id}`;
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: process.env.REACT_APP_ADMIN_WALLET || "EQDrzVBj0qF2cBkuGyy0D-ChwQJpIcqLkf5_DvyXqgOTMwt8", // Admin wallet address
            amount: String(Math.floor(pack.price * 1e9)), // Convert TON to nanoTON
            payload: btoa(commentText), // Encode as base64
          },
        ],
      };

      // Send transaction through TonConnect
      const result = await sendTransaction(transaction);
      
      // Notify backend about completed transaction
      await axios.post(`${API}/buy/pack`, {
        user_id: user.id,
        pack_id: pack.id,
        payment_type: "TON",
        transaction_hash: result.boc || result, // Transaction hash from blockchain
      });

      toast.success(`✨ ${t.marketplace.purchased} ${pack.name}!`, {
        style: {
          background: "linear-gradient(to right, #10b981, #059669)",
          color: "#fff",
        },
      });

      // Reload to update inventory
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Purchase error:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        t.marketplace.purchaseError;
      toast.error(errorMessage, {
        style: {
          background: "linear-gradient(to right, #ef4444, #dc2626)",
          color: "#fff",
        },
      });
    } finally {
      setBuyingPackId(null);
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

  const getPriceColor = (priceType) => {
    switch (priceType) {
      case "STARS": return "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent";
      case "SXTON": return "bg-gradient-to-r from-purple-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent";
      case "TON": return "bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent";
      default: return "bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent";
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
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 transition-colors relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <TrendingUp className="text-purple-400 relative z-10" size={14} />
            <span className="text-purple-400 font-semibold text-sm relative z-10">{transactions}</span>
            <span className="text-gray-400 text-xs relative z-10">transactions</span>
          </div>
        </div>
      </div>

      {/* Banner Ads Carousel */}
      {banners.length > 0 && (
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="text-orange-400" size={16} />
            <h2 className="text-base font-semibold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              Promotional Offers
            </h2>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {banners.map((banner) => (
              <a
                key={banner.id}
                href={banner.link_url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`banner-ad-${banner.id}`}
                className="glass-card p-2 min-w-[200px] flex-shrink-0 border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 transition-colors duration-300 cursor-pointer relative overflow-hidden"
              >
                <div className="cosmic-particles"></div>
                {banner.cover_image_url && (
                  <div className="relative mb-1.5 overflow-hidden rounded-lg z-10">
                    <img
                      src={banner.cover_image_url}
                      alt={banner.title}
                      className="w-full h-20 object-cover"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-white text-xs mb-0.5 relative z-10 line-clamp-1">{banner.title}</h3>
                <p className="text-xs text-gray-400 mb-1.5 relative z-10 line-clamp-1">{banner.description}</p>
                <div className="flex items-center gap-2 relative z-10">
                  <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                    {banner.link_type === "channel" ? "📱" : "🌐"}
                  </Badge>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

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
                    src={imageErrors[pack.id] ? FALLBACK_IMAGE : (pack.image_url || FALLBACK_IMAGE)}
                    alt={pack.name}
                    className="w-full h-24 object-cover bg-gradient-to-br from-slate-700 to-slate-800"
                    onError={() => setImageErrors({...imageErrors, [pack.id]: true})}
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
                  <span className={`text-sm font-bold ${getPriceColor(pack.price_type)}`}>
                    {pack.price} {pack.price_type}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBuy(pack)}
                    disabled={buyingPackId === pack.id || isConnecting}
                    data-testid={`buy-featured-${pack.id}`}
                    className={`transition-colors shadow-lg h-7 px-2 text-xs ${
                      wallet
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                        : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    }`}
                  >
                    {buyingPackId === pack.id ? (
                      <Sparkles size={12} className="mr-1 animate-spin" />
                    ) : wallet ? (
                      <ShoppingCart size={12} className="mr-1" />
                    ) : (
                      <Wallet size={12} className="mr-1" />
                    )}
                    {buyingPackId === pack.id ? "Processing..." : wallet ? t.marketplace.buy : "Connect Wallet"}
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
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-3 skeleton h-32"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {packs.map((pack) => (
            <div
              key={pack.id}
              data-testid={`pack-card-${pack.id}`}
              className="glass-card p-3 flex gap-3 border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-cyan-500/50 transition-colors duration-300 cursor-pointer relative overflow-hidden"
            >
              <div className="cosmic-particles"></div>
              <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg z-10">
                <img
                  src={imageErrors[pack.id] ? FALLBACK_IMAGE : (pack.image_url || FALLBACK_IMAGE)}
                  alt={pack.name}
                  className="w-full h-full object-cover bg-gradient-to-br from-slate-700 to-slate-800"
                  onError={() => setImageErrors({...imageErrors, [pack.id]: true})}
                />
                {pack.show_number && (
                  <Badge className="absolute -top-1 -right-1 bg-gradient-to-br from-cyan-500 to-blue-500 text-xs shadow-lg">
                    #{pack.sticker_count}
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-white text-sm">{pack.name}</h3>
                    <Badge className={`${getRarityColor(pack.rarity)} text-xs shadow-lg`}>
                      {pack.rarity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">{pack.description}</p>
                  {pack.is_upcoming && (
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <Clock size={12} className="text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">Coming Soon</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-1.5">
                  <span className={`text-base font-bold ${getPriceColor(pack.price_type)}`}>
                    {pack.price} {pack.price_type}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBuy(pack)}
                    data-testid={`buy-pack-${pack.id}`}
                    disabled={pack.is_upcoming || buyingPackId === pack.id || isConnecting}
                    className={`transition-colors shadow-lg h-7 px-3 text-xs ${
                      pack.is_upcoming
                        ? "bg-gray-500/50 hover:bg-gray-500/50 text-gray-300"
                        : wallet
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                        : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    }`}
                  >
                    {buyingPackId === pack.id ? (
                      <Sparkles size={12} className="mr-1 animate-spin" />
                    ) : pack.is_upcoming ? (
                      <Clock size={12} className="mr-1" />
                    ) : wallet ? (
                      <ShoppingCart size={12} className="mr-1" />
                    ) : (
                      <Wallet size={12} className="mr-1" />
                    )}
                    {buyingPackId === pack.id ? "Processing..." : pack.is_upcoming ? "Soon" : wallet ? t.marketplace.buy : "Connect Wallet"}
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