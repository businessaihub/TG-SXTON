import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { ShoppingCart, Star, Sparkles, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";

const Marketplace = ({ user, language }) => {
  const [packs, setPacks] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchPacks();
    fetchFeatured();
  }, [filter]);

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
      toast.success(`${t.marketplace.purchased} ${pack.name}!`);
      // Refresh user data
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || t.marketplace.purchaseError);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case "legendary": return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "epic": return "bg-gradient-to-r from-purple-500 to-pink-500";
      case "rare": return "bg-gradient-to-r from-blue-500 to-cyan-500";
      default: return "bg-gradient-to-r from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="p-4 space-y-6" data-testid="marketplace-container">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-4xl font-bold neon-cyan mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          {t.marketplace.title}
        </h1>
        <p className="text-gray-400">{t.marketplace.subtitle}</p>
      </div>

      {/* Featured Carousel */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-cyan-400" size={20} />
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              {t.marketplace.featured}
            </h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {featured.map((pack) => (
              <div
                key={pack.id}
                data-testid={`featured-pack-${pack.id}`}
                className="glass-card p-4 min-w-[280px] flex-shrink-0"
              >
                <div className="relative mb-3">
                  <img
                    src={pack.image_url}
                    alt={pack.name}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Badge className={`absolute top-2 right-2 ${getRarityColor(pack.rarity)}`}>
                    {pack.rarity.toUpperCase()}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-1">{pack.name}</h3>
                <p className="text-sm text-gray-400 mb-2">{pack.sticker_count} stickers</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-cyan-400">
                    {pack.price} {pack.price_type}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBuy(pack)}
                    data-testid={`buy-featured-${pack.id}`}
                    className="bg-cyan-500 hover:bg-cyan-600 btn-animated"
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
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="all" data-testid="filter-all">{t.marketplace.all}</TabsTrigger>
          <TabsTrigger value="my" data-testid="filter-my">{t.marketplace.myStickers}</TabsTrigger>
          <TabsTrigger value="external" data-testid="filter-external">{t.marketplace.external}</TabsTrigger>
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
              className="glass-card p-4 flex gap-4"
            >
              <div className="relative w-24 h-24 flex-shrink-0">
                <img
                  src={pack.image_url}
                  alt={pack.name}
                  className="w-full h-full object-cover rounded-lg"
                />
                {pack.show_number && (
                  <Badge className="absolute -top-1 -right-1 bg-cyan-500 text-xs">
                    #{pack.sticker_count}
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{pack.name}</h3>
                    <Badge className={`${getRarityColor(pack.rarity)} text-xs`}>
                      {pack.rarity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">{pack.description}</p>
                  {pack.is_upcoming && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-yellow-400">
                      <Clock size={14} />
                      <span>Coming Soon</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-cyan-400">
                    {pack.price} {pack.price_type}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleBuy(pack)}
                    data-testid={`buy-pack-${pack.id}`}
                    disabled={pack.is_upcoming}
                    className="bg-cyan-500 hover:bg-cyan-600 btn-animated"
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
        <div className="text-center py-12 text-gray-400">
          <p>{t.marketplace.noPacks}</p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;