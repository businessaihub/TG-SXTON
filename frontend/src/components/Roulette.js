import { useState } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Disc3, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";

const Roulette = ({ user, setUser, language }) => {
  const [spinning, setSpinning] = useState(false);
  const [wonPack, setWonPack] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const t = translations[language] || translations.en;

  const handleSpin = async () => {
    if (!user) {
      toast.error(t.roulette.loginRequired);
      return;
    }

    setSpinning(true);
    setWonPack(null);

    try {
      const response = await axios.post(`${API}/spin`, {
        user_id: user.id
      });

      // Simulate spinning animation
      setTimeout(() => {
        setSpinning(false);
        setWonPack(response.data.pack);
        setShowConfetti(true);
        toast.success(`${t.roulette.won} ${response.data.pack.name}!`);
        
        // Clear confetti after animation
        setTimeout(() => setShowConfetti(false), 3000);
      }, 3000);

    } catch (error) {
      setSpinning(false);
      toast.error(error.response?.data?.detail || t.roulette.spinError);
    }
  };

  const handleKeep = () => {
    toast.success(t.roulette.kept);
    setWonPack(null);
    window.location.reload();
  };

  const handleSell = () => {
    toast.success(t.roulette.listed);
    setWonPack(null);
    window.location.reload();
  };

  return (
    <div className="p-4 space-y-6 min-h-screen" data-testid="roulette-container">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                background: ['#00ffff', '#ff00ff', '#ffff00', '#00ff00'][Math.floor(Math.random() * 4)]
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="pt-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Disc3 className="text-purple-400" size={32} />
          <h1 className="text-4xl font-bold neon-cyan" style={{ fontFamily: 'Space Grotesk' }}>
            {t.roulette.title}
          </h1>
        </div>
        <p className="text-gray-400">{t.roulette.subtitle}</p>
      </div>

      {/* Spin Cost */}
      <div className="glass-card p-4 text-center">
        <div className="text-sm text-gray-400 mb-1">{t.roulette.spinCost}</div>
        <div className="text-3xl font-bold text-cyan-400">1.0 TON</div>
      </div>

      {/* Roulette Animation */}
      <div className="glass-card p-6 overflow-hidden" style={{ minHeight: '200px' }}>
        {spinning ? (
          <div className="relative h-40">
            <div className="roulette-container flex gap-4 items-center">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="glass-card p-4 w-32 flex-shrink-0"
                  style={{ minWidth: '128px' }}
                >
                  <div className="w-full h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="text-cyan-400" size={32} />
                  </div>
                  <div className="text-sm text-center mt-2 text-gray-400">Pack #{i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        ) : wonPack ? (
          <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
            <Trophy className="mx-auto text-yellow-400" size={48} />
            <h2 className="text-2xl font-bold neon-cyan" style={{ fontFamily: 'Space Grotesk' }}>
              {t.roulette.congratulations}
            </h2>
            <div className="glass-card p-4 max-w-xs mx-auto">
              <img
                src={wonPack.image_url}
                alt={wonPack.name}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
              <h3 className="font-semibold text-lg">{wonPack.name}</h3>
              <Badge className="mt-2 bg-purple-500/20 text-purple-400">
                {wonPack.sticker_count} stickers
              </Badge>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleKeep}
                data-testid="keep-pack-btn"
                className="bg-green-500 hover:bg-green-600 btn-animated"
              >
                {t.roulette.keep}
              </Button>
              <Button
                onClick={handleSell}
                data-testid="sell-pack-btn"
                variant="outline"
                className="btn-animated"
              >
                {t.roulette.sell}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Disc3 className="mx-auto mb-3 text-purple-400" size={64} />
            <p>{t.roulette.readyToSpin}</p>
          </div>
        )}
      </div>

      {/* Spin Button */}
      {!wonPack && (
        <Button
          onClick={handleSpin}
          disabled={spinning || !user}
          data-testid="spin-btn"
          className="w-full h-16 text-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 btn-animated"
        >
          {spinning ? (
            <>
              <Disc3 className="mr-2 animate-spin" size={24} />
              {t.roulette.spinning}
            </>
          ) : (
            <>
              <Disc3 className="mr-2" size={24} />
              {t.roulette.spin}
            </>
          )}
        </Button>
      )}

      {/* User Balance */}
      {user && (
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1">{t.roulette.yourBalance}</div>
          <div className="text-xl font-bold text-cyan-400">
            {user.ton_balance?.toFixed(2)} TON
          </div>
        </div>
      )}
    </div>
  );
};

export default Roulette;