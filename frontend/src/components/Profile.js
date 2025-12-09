import { useState } from "react";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Wallet, LogOut, Clock, List, Globe } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";
import { useEffect } from "react";
import Quests from "./Quests";

const Profile = ({ user, setUser, language, setLanguage }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(false);
  const t = translations[language] || translations.en;

  const rarityBorder = (rarity) => {
    switch (rarity) {
      case "Legendary": return "border-yellow-400";
      case "Epic": return "border-purple-500";
      case "Rare": return "border-blue-500";
      case "Uncommon": return "border-teal-400";
      default: return "border-gray-600";
    }
  };

  useEffect(() => {
    const fetchStickers = async () => {
      if (!user || !user.id) return;
      setLoadingStickers(true);
      try {
        const res = await API.get(`/user/${user.id}/stickers`);
        setStickers(res.data || []);
      } catch (e) {
        console.error('Failed to fetch stickers', e);
      } finally {
        setLoadingStickers(false);
      }
    };
    fetchStickers();
  }, [user]);

  const handleConnectWallet = async () => {
    // Mock TonConnect
    const mockAddress = "EQ..." + Math.random().toString(36).substr(2, 9);
      try {
        await API.post(`/wallet/connect`, {
        user_id: user.id,
        wallet_address: mockAddress
      });
      setWalletConnected(true);
      setUser({ ...user, wallet_address: mockAddress });
      toast.success(t.profile.walletConnected);
    } catch (error) {
      toast.error(t.profile.walletError);
    }
  };

  const handleDisconnect = () => {
    setWalletConnected(false);
    setUser({ ...user, wallet_address: null });
    toast.success(t.profile.walletDisconnected);
  };

  return (
    <div className="p-4 space-y-6" data-testid="profile-container">
      {/* Header */}
      <div className="pt-4">
        <h1 className="text-4xl font-bold neon-cyan mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          {t.profile.title}
        </h1>
        <p className="text-gray-400">{user?.username || "Anonymous"}</p>
      </div>

      {/* Wallet Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-cyan-400" size={24} />
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              {t.profile.wallet}
            </h2>
          </div>
          {user?.wallet_address ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              data-testid="disconnect-wallet-btn"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={16} className="mr-1" />
              {t.profile.disconnect}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConnectWallet}
              data-testid="connect-wallet-btn"
              className="bg-cyan-500 hover:bg-cyan-600 btn-animated"
            >
              {t.profile.connect}
            </Button>
          )}
        </div>

        {user?.wallet_address && (
          <div className="text-sm text-gray-400 font-mono">
            {user.wallet_address.substring(0, 8)}...{user.wallet_address.substring(user.wallet_address.length - 6)}
          </div>
        )}
      </div>

      {/* Balances */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1">TON</div>
          <div className="text-2xl font-bold text-cyan-400" data-testid="ton-balance">
            {user?.ton_balance?.toFixed(2) || "0.00"}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1">Stars</div>
          <div className="text-2xl font-bold text-yellow-400" data-testid="stars-balance">
            {user?.stars_balance?.toFixed(0) || "0"}
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-gray-400 mb-1">SXTON</div>
          <div className="text-2xl font-bold text-purple-400" data-testid="sxton-balance">
            {user?.sxton_points?.toFixed(0) || "0"}
          </div>
        </div>
      </div>

      {/* Referrals */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>
          {t.profile.referrals}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">{t.profile.totalReferrals}</span>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-lg px-3 py-1">
            {user?.referral_count || 0}
          </Badge>
        </div>
        <div className="mt-4">
          <Button
            className="w-full bg-purple-500 hover:bg-purple-600 btn-animated"
            data-testid="share-referral-btn"
          >
            {t.profile.shareLink}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <List size={20} className="text-cyan-400" />
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            {t.profile.history}
          </h3>
        </div>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start" data-testid="history-listed-btn">
            <Clock size={16} className="mr-2" />
            {t.profile.listed}
          </Button>
          <Button variant="outline" className="w-full justify-start" data-testid="history-unlisted-btn">
            <Clock size={16} className="mr-2" />
            {t.profile.unlisted}
          </Button>
        </div>
      </div>

      {/* Quests Section */}
      <div className="glass-card p-6">
        <Quests user={user} setUser={setUser} language={language} />
      </div>

      {/* My Stickers */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>
          {t.profile.myStickers || 'My Stickers'}
        </h3>
        {loadingStickers ? (
          <div>Loading stickers…</div>
        ) : stickers.length === 0 ? (
          <div className="text-sm text-gray-400">You have no stickers yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stickers.map((st) => (
              <div key={st.id} className={`p-3 rounded-lg flex items-center gap-3 border ${rarityBorder(st.rarity)} bg-gradient-to-br from-black/20 to-white/2`}>
                <img src={st.image_url} alt={`${st.pack_name} #${st.sticker_number}`} className="w-16 h-16 object-cover rounded-md" />
                <div>
                  <div className="font-semibold text-white">{st.pack_name} #{st.sticker_number}</div>
                  <div className="text-sm text-gray-300">{st.rarity}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          className="w-full bg-green-500 hover:bg-green-600 btn-animated"
          data-testid="deposit-btn"
        >
          {t.profile.deposit}
        </Button>
        <Button
          variant="outline"
          className="w-full btn-animated"
          data-testid="withdraw-btn"
        >
          {t.profile.withdraw}
        </Button>
      </div>
    </div>
  );
};

export default Profile;