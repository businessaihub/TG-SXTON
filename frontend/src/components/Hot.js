import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Badge } from "./ui/badge";
import { Flame, TrendingUp, Star } from "lucide-react";
import { translations } from "../utils/translations";

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='300' height='200' fill='%23667eea'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20' fill='white' font-weight='bold'%3ESticker Pack%3C/text%3E%3Ctext x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23ddd'%3ENo Image%3C/text%3E%3C/svg%3E";

const Hot = ({ language }) => {
  const [hotCollections, setHotCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const t = translations[language] || translations.en;

  useEffect(() => {
    fetchHot();
  }, []);

  const fetchHot = async () => {
    try {
      const response = await axios.get(`${API}/hot`);
      setHotCollections(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching hot collections:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6" data-testid="hot-container">
      {/* Header */}
      <div className="pt-4">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="text-orange-400" size={32} />
          <h1 className="text-4xl font-bold neon-cyan" style={{ fontFamily: 'Space Grotesk' }}>
            {t.hot.title}
          </h1>
        </div>
        <p className="text-gray-400">{t.hot.subtitle}</p>
      </div>

      {/* Hot Collections */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-4 skeleton h-32"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {hotCollections.map((pack, index) => (
            <div
              key={pack.id}
              data-testid={`hot-pack-${pack.id}`}
              className="glass-card p-4 relative overflow-hidden"
            >
              <div className="flex gap-4">
                <img
                  src={imageErrors[pack.id] ? FALLBACK_IMAGE : (pack.image_url || FALLBACK_IMAGE)}
                  alt={pack.name}
                  className="w-24 h-24 object-cover rounded-lg bg-gradient-to-br from-slate-700 to-slate-800"
                  onError={() => setImageErrors({...imageErrors, [pack.id]: true})}
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{pack.name}</h3>
                    <TrendingUp className="text-green-400" size={18} />
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-2">{pack.description}</p>
                  
                  <div className="flex items-center gap-3">
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      {pack.price} {pack.price_type}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {pack.sticker_count} stickers
                    </Badge>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      {pack.rarity}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Fire effect overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent blur-3xl"></div>
            </div>
          ))}
        </div>
      )}

      {!loading && hotCollections.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>{t.hot.noCollections}</p>
        </div>
      )}
    </div>
  );
};

export default Hot;