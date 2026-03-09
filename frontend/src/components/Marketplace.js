import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ShoppingCart, Star, Sparkles, Clock, Flame, Activity as ActivityIcon, ArrowUpDown, Wallet, X, Info, Package } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPack, setSelectedPack] = useState(null);
  const [showPackDetails, setShowPackDetails] = useState(false);
  const [userStickers, setUserStickers] = useState([]);
  const [showMyStickers, setShowMyStickers] = useState(false);
  const [packStats, setPackStats] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [packPopularity, setPackPopularity] = useState({});
  const [nftCollections, setNftCollections] = useState(null);
  const [loadingNftCollections, setLoadingNftCollections] = useState(false);
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

  useEffect(() => {
    if (filter === "external") {
      fetchNftCollections();
    }
  }, [filter, user?.id]);

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

  const fetchUserStickers = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API}/user/${user.id}/stickers`);
      setUserStickers(response.data);
    } catch (error) {
      console.error("Error fetching user stickers:", error);
    }
  };

  const fetchPackStats = async (packId) => {
    try {
      const response = await axios.get(`${API}/pack/${packId}/stats`);
      setPackStats(prev => ({...prev, [packId]: response.data}));
    } catch (error) {
      console.error("Error fetching pack stats:", error);
    }
  };

  const fetchUserRating = async (packId) => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API}/pack/${packId}/user-rating/${user.id}`);
      setUserRatings(prev => ({...prev, [packId]: response.data}));
    } catch (error) {
      console.error("Error fetching user rating:", error);
    }
  };

  const fetchPackPopularity = async (packId) => {
    try {
      const response = await axios.get(`${API}/pack/${packId}/popularity`);
      setPackPopularity(prev => ({...prev, [packId]: response.data}));
    } catch (error) {
      console.error("Error fetching pack popularity:", error);
    }
  };

  const fetchNftCollections = async () => {
    if (!user?.id) return;
    setLoadingNftCollections(true);
    try {
      const response = await axios.get(`${API}/user/${user.id}/nft-collections`);
      setNftCollections(response.data);
    } catch (error) {
      console.error("Error fetching NFT collections:", error);
      setNftCollections({
        available_for_sale: [],
        listed: [],
        not_whitelisted: []
      });
    } finally {
      setLoadingNftCollections(false);
    }
  };

  const handleRatePack = async (packId, rating, liked) => {
    if (!user?.id) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      await axios.post(
        `${API}/pack/${packId}/rate?user_id=${user.id}&rating=${rating}&liked=${liked}`
      );
      
      // Refresh stats
      await fetchPackStats(packId);
      await fetchUserRating(packId);
      
      toast.success("Rating saved!");
    } catch (error) {
      console.error("Error rating pack:", error);
      toast.error("Failed to save rating");
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

  const getFilteredAndSortedPacks = () => {
    let filtered = packs;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pack => 
        pack.name.toLowerCase().includes(query) || 
        (pack.description && pack.description.toLowerCase().includes(query))
      );
    }

    // Filter by type - External shows all packs (same as All)
    // The "my" filter was removed since MyStickers moved to Profile
    if (filter === "external") {
      // Show all packs - same as "all" filter
      filtered = filtered;
    }

    return filtered;
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

  // Live pricing rates (you can update these dynamically from API)
  const PRICE_RATES = {
    TON: 5.2,      // 1 TON = $5.2 USD
    STARS: 0.02,   // 1 STAR = $0.02 USD
    SXTON: 0.15    // 1 SXTON = $0.15 USD
  };

  const convertPrice = (price, priceType, toCurrency = "USD") => {
    const rate = PRICE_RATES[priceType] || 1;
    return (price * rate).toFixed(2);
  };

  const getRarityDistribution = (pack) => {
    // Calculate rarity distribution based on total count
    const total = pack.sticker_count || 0;
    if (total <= 0) return {};
    
    const legendaryCount = Math.max(1, Math.round(total * 0.01));
    const epicCount = Math.round(total * 0.04);
    const rareCount = Math.round(total * 0.10);
    const uncommonCount = Math.round(total * 0.25);
    const commonCount = total - legendaryCount - epicCount - rareCount - uncommonCount;
    
    return {
      legendary: legendaryCount,
      epic: epicCount,
      rare: rareCount,
      uncommon: uncommonCount,
      common: Math.max(0, commonCount)
    };
  };

  const handleOpenPackDetails = (pack) => {
    console.log("Opening pack details for:", pack);
    setSelectedPack(pack);
    setShowPackDetails(true);
    console.log("showPackDetails set to true");
    // Load ratings data
    fetchPackStats(pack.id);
    fetchUserRating(pack.id);
    fetchPackPopularity(pack.id);
  };

  return (
    <div className="p-3 space-y-3 relative" data-testid="marketplace-container">
      {/* Cosmic background */}
      <div className="cosmic-bg-subtle"></div>
      
      {/* Header with Live Stats */}
      <div className="pt-2 relative z-10">
        {/* Brand Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk', letterSpacing: '1.5px' }}>
            <span className="text-white">SXT</span><span className="text-cyan-400">ON</span>
          </h1>
        </div>
        
        {/* Activity Indicators */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center items-center">
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

      {/* Banner Ads Carousel */}
      {banners.length > 0 && (
        <div className="space-y-2 relative z-10 pt-2">
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
                className="carousel-card glass-card p-2 min-w-[200px] flex-shrink-0 border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 transition-all duration-300 cursor-pointer relative overflow-hidden"
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
        <div className="space-y-2 relative z-10 pt-2">
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
                className="carousel-card glass-card p-2.5 min-w-[200px] flex-shrink-0 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 transition-all duration-300 cursor-pointer relative overflow-hidden"
              >
                <div className="cosmic-particles"></div>
                <div className="relative mb-2 overflow-hidden rounded-lg z-10">
                  <img
                    src={imageErrors[pack.id] ? FALLBACK_IMAGE : (pack.image_url || FALLBACK_IMAGE)}
                    alt={pack.name}
                    className="w-full h-24 object-cover bg-gradient-to-br from-slate-700 to-slate-800"
                    onError={() => setImageErrors({...imageErrors, [pack.id]: true})}
                  />
                  {pack.rarity && (
                    <Badge className={`absolute top-1 right-1 text-xs ${getRarityColor(pack.rarity)} shadow-lg`}>
                      {pack.rarity.toUpperCase()}
                    </Badge>
                  )}
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
          <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10 h-9">
            <TabsTrigger 
              value="all" 
              data-testid="filter-all"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 text-sm"
            >
              {t.marketplace.all}
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

        {/* Sort Dropdown & Search */}
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
          
          {/* Search Input */}
          <Input
            placeholder="Search stickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-xs bg-slate-800/50 border-white/10 text-white placeholder-gray-500 h-8 text-sm"
          />
        </div>
      </div>

      {/* Packs/NFT Grid */}
      {loading && filter !== "external" ? (
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-3 skeleton h-32"></div>
          ))}
        </div>
      ) : filter === "external" ? (
        // NFT Collections View
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {loadingNftCollections ? (
            <div className="text-center py-8 text-gray-400">Loading your NFT collections...</div>
          ) : !user?.wallet_address ? (
            <div className="text-center py-8 glass-card p-6 border border-white/10 rounded-lg">
              <p className="text-gray-400 mb-4">Connect your wallet to see your NFT collections</p>
              <Button className="bg-cyan-500 hover:bg-cyan-600" size="sm">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Available for Sale */}
              {(nftCollections?.available_for_sale?.length || 0) > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400 mb-3">Available for Sale ({nftCollections.available_for_sale.length})</h3>
                  <div className="space-y-3">
                    {nftCollections.available_for_sale.map((nft, idx) => (
                      <div key={idx} className="glass-card p-3 flex gap-3 border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-green-500/50 transition-colors duration-300 rounded-lg">
                        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-700 border border-white/10">
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{nft.name}</h4>
                          <p className="text-xs text-gray-400">{nft.collection}</p>
                          <Badge className="mt-2 text-xs capitalize bg-purple-500/20 text-purple-300">{nft.rarity}</Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button className="bg-cyan-500 hover:bg-cyan-600 text-white h-8 text-sm">
                            List for Sale
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Listed */}
              {(nftCollections?.listed?.length || 0) > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Listed on Market ({nftCollections.listed.length})</h3>
                  <div className="space-y-3">
                    {nftCollections.listed.map((nft, idx) => (
                      <div key={idx} className="glass-card p-3 flex gap-3 border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-green-500/50 transition-colors duration-300 rounded-lg">
                        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-700 border border-white/10">
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{nft.name}</h4>
                          <p className="text-xs text-gray-400">{nft.collection}</p>
                          <Badge className="mt-2 text-xs capitalize bg-purple-500/20 text-purple-300">{nft.rarity}</Badge>
                        </div>
                        <div className="flex flex-col items-end justify-center gap-1 flex-shrink-0">
                          <div className="text-cyan-400 font-bold text-sm">{nft.price} {nft.currency}</div>
                          <Button variant="outline" className="h-7 text-xs" size="sm">
                            Remove from Sale
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Not Whitelisted */}
              {(nftCollections?.not_whitelisted?.length || 0) > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">Not Supported ({nftCollections.not_whitelisted.length})</h3>
                  <div className="space-y-3">
                    {nftCollections.not_whitelisted.map((nft, idx) => (
                      <div key={idx} className="glass-card p-3 flex gap-3 border border-yellow-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 opacity-70 rounded-lg">
                        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-700 border border-white/10">
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{nft.name}</h4>
                          <p className="text-xs text-gray-400">{nft.collection}</p>
                          <p className="text-xs text-yellow-400 mt-1">⚠️ Collection not supported for trading</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!nftCollections?.available_for_sale?.length && !nftCollections?.listed?.length && !nftCollections?.not_whitelisted?.length && (
                <div className="text-center py-8 text-gray-400">
                  No NFT collections found in your wallet
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        // Regular Packs View
        <div className="grid grid-cols-1 gap-3 relative z-10">
          {getFilteredAndSortedPacks().map((pack) => (
            <div
              key={pack.id}
              data-testid={`pack-card-${pack.id}`}
              className="glass-card p-3 flex gap-3 border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:border-cyan-500/50 transition-colors duration-300 relative overflow-hidden group"
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
                  
                  {/* Sticker Preview */}
                  {pack.image_urls && pack.image_urls.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {pack.image_urls.slice(0, 3).map((stickerUrl, idx) => (
                        <div key={idx} className="w-8 h-8 rounded overflow-hidden border border-white/10 bg-slate-700">
                          <img
                            src={stickerUrl}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {pack.is_upcoming && (
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <Clock size={12} className="text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">Coming Soon</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-base font-bold ${getPriceColor(pack.price_type)}`}>
                      {pack.price} {pack.price_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      ≈ ${convertPrice(pack.price, pack.price_type)} USD
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPackDetails(pack);
                      }}
                      className="p-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/40 transition-colors opacity-0 group-hover:opacity-100"
                      title="View Details"
                    >
                      <Info size={14} className="text-blue-400" />
                    </button>
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
            </div>
          ))}
        </div>
      )}

      {!loading && packs.length === 0 && filter !== "external" && (
        <div className="text-center py-12 relative z-10">
          <div className="glass-card p-8 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <p className="text-yellow-400">{t.marketplace.noPacks}</p>
          </div>
        </div>
      )}

      {/* Pack Details Modal */}
      {showPackDetails && selectedPack && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowPackDetails(false)}>
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-lg max-w-lg w-full max-h-[70vh] overflow-y-auto z-[10000]" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-blue-400" />
                <h2 className="text-xl font-bold text-white">{selectedPack.name}</h2>
              </div>
              <button onClick={() => setShowPackDetails(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              {/* Pack Image */}
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 bg-slate-700">
                <img
                  src={selectedPack.image_url || FALLBACK_IMAGE}
                  alt={selectedPack.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {e.target.src = FALLBACK_IMAGE}}
                />
              </div>

              {/* Basic Info */}
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400">Description</p>
                <p className="text-sm text-white">{selectedPack.description}</p>
              </div>

              {/* Total Stickers & Price */}
              <div className="grid grid-cols-2 gap-2">
                <div className="glass-card p-1.5 border border-white/10 rounded">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-sm font-bold text-cyan-400">{selectedPack.sticker_count}</p>
                </div>
                <div className="glass-card p-1.5 border border-white/10 rounded">
                  <p className="text-xs text-gray-400">Price</p>
                  <p className={`text-xs font-bold ${getPriceColor(selectedPack.price_type)}`}>
                    {selectedPack.price} {selectedPack.price_type}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ≈ ${convertPrice(selectedPack.price, selectedPack.price_type)} USD
                  </p>
                </div>
              </div>

              {/* Rarity Distribution */}
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 font-semibold">Rarity Distribution</p>
                <div className="space-y-1">
                  {Object.entries(getRarityDistribution(selectedPack)).map(([rarity, count]) => (
                    <div key={rarity} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-gray-300">{rarity}</span>
                      <div className="flex items-center gap-2 flex-1 ml-2">
                        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : rarity === 'epic' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gray-500'}`}
                            style={{ width: `${(count / selectedPack.sticker_count) * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-400 w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Stickers */}
              {selectedPack.image_urls && selectedPack.image_urls.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400 font-semibold">Sample Stickers</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPack.image_urls.slice(0, 6).map((url, idx) => (
                      <div key={idx} className="w-10 h-10 rounded border border-white/10 bg-slate-700 overflow-hidden">
                        <img src={url} alt={`Sticker ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {selectedPack.image_urls.length > 6 && (
                      <div className="w-10 h-10 rounded border border-white/10 bg-slate-700 flex items-center justify-center text-xs text-gray-400">
                        +{selectedPack.image_urls.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              {selectedPack.is_upcoming && (
                <div className="p-2 rounded border border-yellow-500/30 bg-yellow-500/10">
                  <p className="text-xs text-yellow-400 font-semibold">🕒 Coming Soon</p>
                  {selectedPack.countdown_date && (
                    <p className="text-xs text-yellow-300">{new Date(selectedPack.countdown_date).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <Button
                onClick={() => {
                  setShowPackDetails(false);
                  handleBuy(selectedPack);
                }}
                disabled={selectedPack.is_upcoming || buyingPackId === selectedPack.id || isConnecting}
                className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white h-8 text-sm"
              >
                {buyingPackId === selectedPack.id ? 'Processing...' : selectedPack.is_upcoming ? 'Coming Soon' : t.marketplace.buy}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;