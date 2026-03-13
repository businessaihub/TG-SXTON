import { useState } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Wallet, LogOut, Clock, Star, Shield, Package, TrendingUp, DollarSign, Bell, Globe, Gem, Gift, Users, Copy, Share2, Plus } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";
import { useEffect } from "react";
import { useTonConnect } from "../context/TonConnectContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const Profile = ({ user, setUser, language, setLanguage, onLogout }) => {
  const { wallet, connectWallet, disconnectWallet, isConnecting } = useTonConnect();
  const [walletConnected, setWalletConnected] = useState(false);
  const [stickers, setStickers] = useState([]);
  const [loadingStickers, setLoadingStickers] = useState(false);
  const [sellerRating, setSellerRating] = useState(4.8);
  const [sellerStatus, setSellerStatus] = useState("active");
  const [totalSold, setTotalSold] = useState(0);
  
  // Transaction/Seller data states
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [activeTransactionTab, setActiveTransactionTab] = useState("purchases");
  const [listedStickers, setListedStickers] = useState([]);
  const [loadingListedStickers, setLoadingListedStickers] = useState(false);
  const [sellerStats, setSellerStats] = useState(null);
  const [loadingSellerStats, setLoadingSellerStats] = useState(false);
  
  // Notifications setting
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // NFT Collections
  const [nftCollections, setNftCollections] = useState(null);
  const [loadingNftCollections, setLoadingNftCollections] = useState(false);
  const [activeNftTab, setActiveNftTab] = useState("available");
  
  // Assets Tab (My Stickers vs My Collections)
  const [activeAssetTab, setActiveAssetTab] = useState("stickers");
  
  // Promo Code
  const [promoCode, setPromoCode] = useState("");
  
  // Daily Reward
  const [dailyStatus, setDailyStatus] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);
  
  // Referrals
  const [referralInfo, setReferralInfo] = useState(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  
  const t = translations[language] || translations.en;

  useEffect(() => {
    const fetchStickers = async () => {
      if (!user || !user.id) return;
      setLoadingStickers(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/stickers`);
        setStickers(res.data || []);
      } catch (e) {
        console.error('Failed to fetch stickers', e);
      } finally {
        setLoadingStickers(false);
      }
    };
    fetchStickers();
  }, [user]);

  // Fetch seller stats
  useEffect(() => {
    const fetchSellerStats = async () => {
      if (!user || !user.id) return;
      setLoadingSellerStats(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/seller-stats`);
        if (res.data) {
          setSellerStats(res.data);
          setTotalSold(res.data.total_sold || 0);
          setSellerRating(res.data.seller_rating || 0);
        }
      } catch (e) {
        console.error('Failed to fetch seller stats', e);
      } finally {
        setLoadingSellerStats(false);
      }
    };
    fetchSellerStats();
    
    // Load notifications preference from user
    if (user) {
      setNotificationsEnabled(user.notifications_enabled !== false);
    }
  }, [user]);

  // Fetch daily reward status
  useEffect(() => {
    const fetchDailyStatus = async () => {
      if (!user?.id) return;
      setLoadingDaily(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/daily-status`);
        setDailyStatus(res.data);
      } catch (e) {
        console.error('Failed to fetch daily status', e);
      } finally {
        setLoadingDaily(false);
      }
    };
    fetchDailyStatus();
  }, [user]);

  // Fetch referral info
  useEffect(() => {
    const fetchReferralInfo = async () => {
      if (!user?.id) return;
      setLoadingReferral(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/referral-info`);
        setReferralInfo(res.data);
      } catch (e) {
        console.error('Failed to fetch referral info', e);
      } finally {
        setLoadingReferral(false);
      }
    };
    fetchReferralInfo();
  }, [user]);

  // Claim daily reward handler
  const handleClaimDaily = async () => {
    if (!user?.id || claimingDaily) return;
    setClaimingDaily(true);
    try {
      const res = await axios.post(`${API}/daily-reward/claim?user_id=${user.id}`);
      toast.success(`+${res.data.reward} SXTON! Day ${res.data.day_in_cycle}/7 streak`);
      setUser(res.data.user);
      setDailyStatus({ available: false, remaining_seconds: 86400, streak: res.data.streak, next_reward: (res.data.day_in_cycle % 7 + 1) * 50, day_in_cycle: res.data.day_in_cycle + 1 });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to claim reward");
    } finally {
      setClaimingDaily(false);
    }
  };

  // Copy referral link handler
  const handleCopyReferral = () => {
    if (referralInfo?.referral_link) {
      navigator.clipboard.writeText(referralInfo.referral_link).then(() => {
        toast.success("Referral link copied!");
      }).catch(() => {
        toast.error("Failed to copy");
      });
    }
  };

  // Share referral link handler
  const handleShareReferral = () => {
    if (referralInfo?.referral_link && navigator.share) {
      navigator.share({ title: "Join StickerXton!", url: referralInfo.referral_link }).catch(() => {});
    } else if (referralInfo?.referral_link) {
      handleCopyReferral();
    }
  };

  // Fetch transactions by type
  const fetchTransactions = async (type) => {
    if (!user || !user.id) return;
    setLoadingTransactions(true);
    try {
      const res = await axios.get(`${API}/user/${user.id}/transactions?transaction_type=${type}`);
      setTransactions(res.data || []);
    } catch (e) {
      console.error('Failed to fetch transactions', e);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch listed stickers
  useEffect(() => {
    const fetchListedStickers = async () => {
      if (!user || !user.id) return;
      setLoadingListedStickers(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/listed-stickers`);
        setListedStickers(res.data || []);
      } catch (e) {
        console.error('Failed to fetch listed stickers', e);
      } finally {
        setLoadingListedStickers(false);
      }
    };
    fetchListedStickers();
  }, [user]);

  // Fetch NFT Collections
  useEffect(() => {
    const fetchNftCollections = async () => {
      if (!user || !user.id || !user.wallet_address) return;
      setLoadingNftCollections(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/nft-collections`);
        setNftCollections(res.data || {});
      } catch (e) {
        console.error('Failed to fetch NFT collections', e);
        setNftCollections({
          available_for_sale: [],
          listed: [],
          not_whitelisted: []
        });
      } finally {
        setLoadingNftCollections(false);
      }
    };
    fetchNftCollections();
  }, [user?.wallet_address]);

  const handleTransactionTab = (type) => {
    setActiveTransactionTab(type);
    fetchTransactions(type);
  };

  const handleToggleNotifications = async (enabled) => {
    if (!user || !user.id) return;
    try {
      await axios.put(`${API}/user/${user.id}/settings`, {
        notifications_enabled: enabled
      });
      setNotificationsEnabled(enabled);
      setUser({ ...user, notifications_enabled: enabled });
      toast.success(enabled ? "Notifications enabled" : "Notifications disabled");
    } catch (error) {
      console.error('Failed to update notifications', error);
      toast.error("Failed to update notifications");
    }
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      toast.error(t.profile.walletError);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      // Clear wallet on backend so it doesn't reappear on reload
      if (user?.id) {
        await axios.post(`${API}/wallet/disconnect?user_id=${user.id}`).catch(() => {});
      }
      setUser({ ...user, wallet_address: null });
      toast.success(t.profile.walletDisconnected);
    } catch (error) {
      toast.error("Failed to disconnect wallet");
    }
  };

  // Sync TonConnect wallet with backend
  useEffect(() => {
    if (wallet && user?.id) {
      const address = wallet.account?.address || "";
      // Only sync if wallet has an address AND user doesn't already have it
      // Skip if user.wallet_address is null (user intentionally disconnected)
      if (address && user.wallet_address !== null && address !== user.wallet_address) {
        axios.post(`${API}/wallet/connect?user_id=${user.id}&wallet_address=${address}`)
          .then(() => setUser(prev => ({ ...prev, wallet_address: address })))
          .catch(e => console.error("Failed to sync wallet", e));
      }
    }
  }, [wallet]);

  return (
    <div className="space-y-3 pt-1" data-testid="profile-container">

      {/* ═══════ SECTION 1: Profile + Wallet + Balances ═══════ */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        {/* Row: Avatar + User Info + Language */}
        <div className="p-3 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold neon-cyan leading-tight" style={{ fontFamily: 'Space Grotesk' }}>
                {user?.username || "Anonymous"}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                <Globe size={11} className="text-cyan-400" />
                <span>ID: {user?.id?.substring(0, 8) || "N/A"}...</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-[11px]">
                  <Shield size={11} className="text-green-400" />
                  <span className="capitalize text-green-400 font-semibold">{sellerStatus}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <Star size={11} className="text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">{sellerRating} ⭐</span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 hover:bg-white/10 rounded-lg transition h-fit">
                  <Globe size={20} className="text-cyan-400 hover:text-cyan-300" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage("en")}>
                  {language === "en" && <span className="mr-2">✓</span>}
                  🇬🇧 English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("tr")}>
                  {language === "tr" && <span className="mr-2">✓</span>}
                  🇹🇷 Türkçe
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("zh")}>
                  {language === "zh" && <span className="mr-2">✓</span>}
                  🇨🇳 中文
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("ru")}>
                  {language === "ru" && <span className="mr-2">✓</span>}
                  🇷🇺 Русский
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("ar")}>
                  {language === "ar" && <span className="mr-2">✓</span>}
                  🇸🇦 العربية
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("ko")}>
                  {language === "ko" && <span className="mr-2">✓</span>}
                  🇰🇷 한국어
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("ja")}>
                  {language === "ja" && <span className="mr-2">✓</span>}
                  🇯🇵 日本語
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("de")}>
                  {language === "de" && <span className="mr-2">✓</span>}
                  🇩🇪 Deutsch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("fr")}>
                  {language === "fr" && <span className="mr-2">✓</span>}
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("uk")}>
                  {language === "uk" && <span className="mr-2">✓</span>}
                  🇺🇦 Українська
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("th")}>
                  {language === "th" && <span className="mr-2">✓</span>}
                  🇹🇭 ไทย
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Wallet Row + Notification + Logout */}
        <div className="px-3 py-2 bg-white/[0.03] border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Wallet size={14} className="text-cyan-400 flex-shrink-0" />
              {(wallet || user?.wallet_address) ? (
                <span className="text-xs text-gray-400 font-mono truncate">
                  {(() => { const addr = wallet?.account?.address || user?.wallet_address || ""; return addr.substring(0, 8) + "..." + addr.substring(addr.length - 6); })()}
                </span>
              ) : (
                <span className="text-xs text-gray-500">{t.profile.wallet}</span>
              )}
              {(wallet || user?.wallet_address) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  data-testid="disconnect-wallet-btn"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-xs px-2 flex-shrink-0"
                >
                  <LogOut size={12} className="mr-1" />
                  {t.profile.disconnect}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnectWallet}
                  data-testid="connect-wallet-btn"
                  className="bg-cyan-500 hover:bg-cyan-600 btn-animated h-7 text-xs px-3 flex-shrink-0"
                >
                  {t.profile.connect}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 hover:bg-white/10 rounded-lg transition">
                    <Bell size={16} className={notificationsEnabled ? "text-cyan-400" : "text-gray-500"} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="glass-card border-white/10">
                  <DropdownMenuItem
                    onClick={() => handleToggleNotifications(true)}
                    className={`cursor-pointer ${notificationsEnabled ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                  >
                    🔔 Enable
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleToggleNotifications(false)}
                    className={`cursor-pointer ${!notificationsEnabled ? "bg-cyan-500/20 text-cyan-400" : ""}`}
                  >
                    🔕 Disable
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button className="p-1.5 hover:bg-white/10 rounded-lg transition" onClick={onLogout}>
                <LogOut size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Balances + Stats Grid */}
        <div className="px-3 py-2 border-t border-white/10">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            <div className="bg-white/5 rounded-lg py-1.5">
              <div className="text-[10px] text-gray-500">TON</div>
              <div className="text-sm font-bold text-cyan-400" data-testid="ton-balance">{user?.ton_balance?.toFixed(2) || "0.00"}</div>
            </div>
            <div className="bg-white/5 rounded-lg py-1.5">
              <div className="text-[10px] text-gray-500">Stars</div>
              <div className="text-sm font-bold text-yellow-400" data-testid="stars-balance">{user?.stars_balance?.toFixed(0) || "0"}</div>
            </div>
            <div className="bg-white/5 rounded-lg py-1.5">
              <div className="text-[10px] text-gray-500">SXTON</div>
              <div className="text-sm font-bold text-purple-400" data-testid="sxton-balance">{user?.sxton_points?.toFixed(0) || "0"}</div>
            </div>
            <div className="bg-white/5 rounded-lg py-1.5">
              <div className="text-[10px] text-gray-500">{t.profile.purchased}</div>
              <div className="text-sm font-bold text-cyan-400">{stickers.length}</div>
            </div>
            <div className="bg-white/5 rounded-lg py-1.5">
              <div className="text-[10px] text-gray-500">{t.profile.sold}</div>
              <div className="text-sm font-bold text-purple-400">{sellerStats?.total_sold || totalSold}</div>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Gem size={14} className="text-purple-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Promo Code..."
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-700/50 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50 transition min-w-0"
            />
            <Button
              size="sm"
              onClick={async () => {
                if (!promoCode.trim()) {
                  toast.error("Enter a code");
                  return;
                }
                try {
                  const response = await axios.post(`${API}/promo-codes/validate?code=${promoCode}&user_id=${user?.id || ""}`);
                  
                  let message = "Code applied!";
                  if (response.data.promoType === "discount") {
                    message = `${response.data.discount}${response.data.discountType === "percent" ? "%" : " TON"} discount applied!`;
                  } else if (response.data.promoType === "sxton_token") {
                    message = `${response.data.sxtonAmount} SXTON tokens added to your balance!`;
                  } else if (response.data.promoType === "guaranteed_sticker") {
                    const rarity = response.data.stickerRarity.charAt(0).toUpperCase() + response.data.stickerRarity.slice(1);
                    message = `${rarity} sticker reward granted!`;
                  }
                  
                  // Refresh user data to show updated balance
                  try {
                    const userRes = await axios.get(`${API}/user/${user.id}`);
                    setUser(userRes.data);
                  } catch (e) {}
                  
                  toast.success(message);
                  setPromoCode("");
                } catch (error) {
                  toast.error(error.response?.data?.detail || "Invalid code");
                }
              }}
              className="bg-purple-500 hover:bg-purple-600 text-xs h-6 px-2 flex-shrink-0"
            >
              Apply
            </Button>
          </div>
        </div>

      {/* ═══════ DAILY REWARD (inside main card) ═══════ */}
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift size={14} className="text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Daily Reward</div>
                {dailyStatus && (
                  <div className="text-[10px] text-gray-400">
                    Streak: {dailyStatus.streak} • Day {dailyStatus.day_in_cycle}/7
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dailyStatus && !dailyStatus.available && dailyStatus.remaining_seconds > 0 && (
                <span className="text-[10px] text-gray-500">
                  {Math.floor(dailyStatus.remaining_seconds / 3600)}h {Math.floor((dailyStatus.remaining_seconds % 3600) / 60)}m
                </span>
              )}
              <Button
                size="sm"
                disabled={loadingDaily || claimingDaily || (dailyStatus && !dailyStatus.available)}
                onClick={handleClaimDaily}
                className={`h-6 text-[11px] px-2 ${
                  dailyStatus?.available
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white btn-animated"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {claimingDaily ? "..." : dailyStatus?.available ? `Claim ${dailyStatus?.next_reward || 50} SXTON` : "Claimed"}
              </Button>
            </div>
          </div>
          {/* Streak dots */}
          {dailyStatus && (
            <div className="flex gap-1 mt-1.5 justify-center">
              {[1, 2, 3, 4, 5, 6, 7].map(day => (
                <div
                  key={day}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                    day <= (dailyStatus.streak % 7 || (dailyStatus.streak > 0 ? 7 : 0))
                      ? "bg-amber-500/30 border-amber-500 text-amber-400"
                      : day === ((dailyStatus.streak % 7) + 1) && dailyStatus.available
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-400 animate-pulse"
                        : "bg-white/5 border-white/10 text-gray-600"
                  }`}
                >
                  {day * 50}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══════ REFERRALS (inside main card) ═══════ */}
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">Referrals <span className="text-[10px] text-gray-400 font-normal">• 500 SXTON/friend</span></div>
            </div>
            {referralInfo && (
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-bold text-blue-400">{referralInfo.referral_count}</span>
                <span className="text-[10px] text-gray-500 ml-1">invited</span>
              </div>
            )}
          </div>
          {referralInfo && (
            <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1.5 border border-white/10 mt-1.5">
              <span className="text-[9px] text-gray-400 truncate flex-1 font-mono">
                {referralInfo.referral_link}
              </span>
              <button
                onClick={handleCopyReferral}
                className="p-1 hover:bg-white/10 rounded transition flex-shrink-0"
              >
                <Copy size={12} className="text-cyan-400" />
              </button>
              <button
                onClick={handleShareReferral}
                className="p-1 hover:bg-white/10 rounded transition flex-shrink-0"
              >
                <Share2 size={12} className="text-blue-400" />
              </button>
            </div>
          )}
          {referralInfo?.total_earned > 0 && (
            <div className="text-[10px] text-gray-400 mt-1 text-center">
              Earned: <span className="text-purple-400 font-bold">{referralInfo.total_earned} SXTON</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ BALANCE TOP-UP ═══════ */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Plus size={16} className="text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Top-Up Balance</div>
                <div className="text-[10px] text-gray-400">Deposit TON to your account</div>
              </div>
            </div>
            {(wallet || user?.wallet_address) ? (
              <Button
                size="sm"
                onClick={async () => {
                  toast.info("Send TON to your connected wallet address to top up.");
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-7 text-xs px-3 btn-animated"
              >
                <DollarSign size={12} className="mr-1" />
                Deposit
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConnectWallet}
                className="bg-cyan-500 hover:bg-cyan-600 text-white h-7 text-xs px-3"
              >
                <Wallet size={12} className="mr-1" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ SECTION 2: History + Assets (Tabbed) ═══════ */}
      <div className="glass-card p-3 rounded-lg border border-white/10">
        {/* Segmented Tabs */}
        <div className="flex gap-1 mb-3 p-0.5 bg-white/5 rounded-lg border border-white/10 overflow-x-auto">
          <button
            onClick={() => setActiveAssetTab("stickers")}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap ${
              activeAssetTab === "stickers"
                ? "bg-cyan-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Package size={12} className="inline mr-1" />
            Stickers
          </button>
          <button
            onClick={() => setActiveAssetTab("collections")}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap ${
              activeAssetTab === "collections"
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Gem size={12} className="inline mr-1" />
            Collections
          </button>
          <button
            onClick={() => setActiveAssetTab("history")}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap ${
              activeAssetTab === "history"
                ? "bg-purple-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp size={12} className="inline mr-1" />
            History
          </button>
        </div>

        {/* My Stickers Tab */}
        {activeAssetTab === "stickers" && (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {loadingStickers || loadingListedStickers ? (
              <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
            ) : (stickers.length === 0 && listedStickers.length === 0) ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                No stickers yet. <a href="#/marketplace" className="text-cyan-400 hover:underline">Buy some!</a>
              </div>
            ) : (
              <>
                {stickers.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5">PURCHASED ({stickers.length})</div>
                    {stickers.map((st) => (
                      <div key={st.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-white/10">
                        <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                          <img src={st.image_url} alt={st.pack_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{st.pack_name}</div>
                          <div className="text-[10px] text-gray-400">#{st.sticker_number} • {st.rarity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {listedStickers.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5">FOR SALE ({listedStickers.length})</div>
                    {listedStickers.map((st) => (
                      <div key={st.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/30">
                        <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-green-500/30">
                          <img src={st.image_url} alt={st.pack_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{st.pack_name}</div>
                          <div className="text-[10px] text-gray-400">#{st.sticker_number} • {st.rarity}</div>
                        </div>
                        <div className="text-xs font-bold text-green-400 flex-shrink-0">{st.price.toFixed(2)} TON</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* My Collections Tab */}
        {activeAssetTab === "collections" && (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {!user?.wallet_address ? (
              <div className="text-center py-6 text-gray-400 text-sm border border-blue-500/30 rounded p-3">
                <p className="mb-1">🔗 Connect your wallet to see NFT collections</p>
                <p className="text-[10px] text-gray-500">NFT from other markets will appear here</p>
              </div>
            ) : loadingNftCollections ? (
              <div className="text-center py-4 text-gray-400 text-sm">Loading NFTs...</div>
            ) : (
              <>
                {(nftCollections?.available_for_sale?.length || 0) > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5">AVAILABLE ({nftCollections.available_for_sale.length})</div>
                    {nftCollections.available_for_sale.map((nft, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/30">
                        <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{nft.name}</div>
                          <div className="text-[10px] text-gray-400">{nft.collection} • {nft.rarity}</div>
                        </div>
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white h-7 text-[10px] flex-shrink-0">
                          List
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {(nftCollections?.listed?.length || 0) > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5">LISTED ({nftCollections.listed.length})</div>
                    {nftCollections.listed.map((nft, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/30">
                        <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-green-500/30">
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{nft.name}</div>
                          <div className="text-[10px] text-gray-400">{nft.collection} • {nft.rarity}</div>
                        </div>
                        <div className="text-xs font-bold text-green-400 flex-shrink-0">{nft.price} {nft.currency}</div>
                      </div>
                    ))}
                  </div>
                )}
                {(nftCollections?.not_whitelisted?.length || 0) > 0 && (
                  <details className="mt-3 text-xs text-gray-500">
                    <summary className="font-semibold px-1 py-0.5 cursor-pointer hover:text-gray-400 transition-colors text-[10px]">⊕ NOT SUPPORTED ({nftCollections.not_whitelisted.length})</summary>
                    <div className="mt-1.5 space-y-1">
                      {nftCollections.not_whitelisted.map((nft, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-1.5 opacity-50 border border-yellow-500/20 rounded">
                          <div className="w-12 h-12 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                            <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold text-white truncate">{nft.name}</div>
                            <div className="text-[10px] text-yellow-400">Unsupported collection</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {!nftCollections?.available_for_sale?.length && !nftCollections?.listed?.length && !nftCollections?.not_whitelisted?.length && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No NFT collections in your wallet
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeAssetTab === "history" && (
          <div>
            {/* Transaction type selector */}
            <div className="flex gap-1 mb-2">
              <button 
                className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  activeTransactionTab === "purchases" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
                data-testid="history-purchases-btn"
                onClick={() => handleTransactionTab("purchases")}
              >
                <Clock size={11} className="inline mr-1" />
                {t.profile.purchases}
              </button>
              <button 
                className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  activeTransactionTab === "sales" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
                data-testid="history-sales-btn"
                onClick={() => handleTransactionTab("sales")}
              >
                <DollarSign size={11} className="inline mr-1" />
                {t.profile.sales}
              </button>
              <button 
                className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  activeTransactionTab === "earnings" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
                data-testid="history-earnings-btn"
                onClick={() => handleTransactionTab("earnings")}
              >
                <TrendingUp size={11} className="inline mr-1" />
                {t.profile.earnings}
              </button>
            </div>

            {/* Transactions List */}
            {loadingTransactions ? (
              <div className="text-center py-4 text-gray-400 text-sm">{t.profile.loading}</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">{t.profile.noTransactions}</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-2 bg-white/5 rounded border border-white/10 text-xs">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-semibold truncate mr-2">
                        {tx.sticker?.pack_name || "Pack Transfer"}
                      </span>
                      <span className={`flex-shrink-0 ${tx.is_seller ? "text-green-400" : "text-red-400"}`}>
                        {tx.is_seller ? "+" : "-"}{tx.amount.toFixed(2)} {tx.currency}
                      </span>
                    </div>
                    {tx.sticker && (
                      <p className="text-gray-400 text-[10px]">#{tx.sticker.number} {tx.sticker.rarity}</p>
                    )}
                    <p className="text-gray-500 text-[10px]">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;