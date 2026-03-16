import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Wallet, LogOut, Clock, Star, Shield, Package, TrendingUp, DollarSign, Globe, Gem, Gift, Users, Copy, Share2, Plus, Info, Gamepad2, X } from "lucide-react";
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

const PROFILE_TABS = [
  { id: "stickers", label: "Stickers", icon: Package, color: "cyan" },
  { id: "listed", label: "Listed", icon: DollarSign, color: "green" },
  { id: "rewards", label: "Rewards", icon: Gift, color: "amber" },
  { id: "referrals", label: "Referrals", icon: Users, color: "blue" },
];

const Profile = ({ user, setUser, language, setLanguage }) => {
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
  
  // NFT Collections
  const [nftCollections, setNftCollections] = useState(null);
  const [loadingNftCollections, setLoadingNftCollections] = useState(false);
  const [activeNftTab, setActiveNftTab] = useState("available");
  
  // Profile Tabs
  const [activeProfileTab, setActiveProfileTab] = useState("stickers");
  const [slideDirection, setSlideDirection] = useState("right");
  const [isAnimating, setIsAnimating] = useState(false);
  const tabBarRef = useRef(null);
  const [showGameBalanceInfo, setShowGameBalanceInfo] = useState(false);
  
  // Sell modal
  const [sellStickerId, setSellStickerId] = useState(null);
  const [sellPrice, setSellPrice] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  
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

  const handleListForSale = async () => {
    if (!sellStickerId || !sellPrice || parseFloat(sellPrice) <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSellLoading(true);
    try {
      await axios.post(`${API}/sell/sticker?sticker_id=${sellStickerId}&price=${parseFloat(sellPrice)}`);
      toast.success("Sticker listed for sale!");
      setSellStickerId(null);
      setSellPrice("");
      // Refresh stickers
      const res = await axios.get(`${API}/user/${user.id}/stickers`);
      setStickers(res.data || []);
      const listedRes = await axios.get(`${API}/user/${user.id}/listed-stickers`);
      setListedStickers(listedRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to list sticker");
    } finally {
      setSellLoading(false);
    }
  };

  const handleUnlist = async (stickerId) => {
    try {
      await axios.post(`${API}/unlist/sticker?sticker_id=${stickerId}`);
      toast.success("Sticker removed from sale");
      const res = await axios.get(`${API}/user/${user.id}/stickers`);
      setStickers(res.data || []);
      const listedRes = await axios.get(`${API}/user/${user.id}/listed-stickers`);
      setListedStickers(listedRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to unlist");
    }
  };

  const handleTabSwitch = useCallback((newTab) => {
    if (newTab === activeProfileTab || isAnimating) return;
    const oldIdx = PROFILE_TABS.findIndex(t => t.id === activeProfileTab);
    const newIdx = PROFILE_TABS.findIndex(t => t.id === newTab);
    setSlideDirection(newIdx > oldIdx ? "right" : "left");
    setIsAnimating(true);
    setTimeout(() => {
      setActiveProfileTab(newTab);
      setTimeout(() => setIsAnimating(false), 50);
    }, 150);
  }, [activeProfileTab, isAnimating]);

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

  const activeTabIdx = PROFILE_TABS.findIndex(tab => tab.id === activeProfileTab);

  return (
    <div className="space-y-3 pt-1" data-testid="profile-container">

      {/* ═══════ SECTION 1: Profile + Wallet + Balances (always visible) ═══════ */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        {/* Row: Avatar + User Info + Language */}
        <div className="p-3 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">👤</span>
              )}
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

        {/* Wallet Row */}
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

        {/* Game Balance + Top-Up */}
        <div className="px-3 py-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <Gamepad2 size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <div className="text-xs font-bold text-white">Game Balance</div>
                  <button
                    onClick={() => setShowGameBalanceInfo(!showGameBalanceInfo)}
                    className="p-0.5 hover:bg-white/10 rounded transition"
                  >
                    <Info size={12} className="text-gray-400 hover:text-cyan-400" />
                  </button>
                </div>
                <div className="text-sm font-bold text-green-400">{user?.ton_balance?.toFixed(2) || "0.00"} TON</div>
              </div>
            </div>
            {(wallet || user?.wallet_address) ? (
              <Button
                size="sm"
                onClick={() => toast.info("Send TON to your connected wallet address to top up.")}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-7 text-xs px-3 btn-animated"
              >
                <Plus size={12} className="mr-1" />
                Top-Up
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConnectWallet}
                className="bg-cyan-500 hover:bg-cyan-600 text-white h-7 text-xs px-3"
              >
                <Wallet size={12} className="mr-1" />
                Connect
              </Button>
            )}
          </div>
          {/* Game Balance Info Popup */}
          {showGameBalanceInfo && (
            <div className="mt-2 p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg relative">
              <button
                onClick={() => setShowGameBalanceInfo(false)}
                className="absolute top-1.5 right-1.5 p-0.5 hover:bg-white/10 rounded"
              >
                <X size={12} className="text-gray-400" />
              </button>
              <div className="flex items-center gap-1.5 mb-2">
                <Gamepad2 size={14} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400">What is Game Balance?</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-gray-300">
                <p>🎮 <span className="text-white font-medium">Game Balance</span> is your TON balance used across all mini-games:</p>
                <div className="grid grid-cols-2 gap-1 pl-4">
                  <span>• Sticker Theft (0.2 TON)</span>
                  <span>• Raid Entry (0.1 TON)</span>
                  <span>• Sticker Battle</span>
                  <span>• Bomb Pass</span>
                </div>
                <p>💰 Top up by depositing TON via your connected wallet.</p>
                <p>🏆 Win games to earn SXTON tokens and rare stickers!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ ANIMATED TAB BAR ═══════ */}
      <div className="glass-card rounded-lg border border-white/10 overflow-hidden">
        <div
          ref={tabBarRef}
          className="flex gap-0.5 px-1.5 py-1.5 overflow-x-auto scrollbar-hide relative"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {PROFILE_TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeProfileTab === tab.id;
            const colorMap = {
              cyan: { active: "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30", inactive: "text-gray-400" },
              green: { active: "bg-green-500 text-white shadow-lg shadow-green-500/30", inactive: "text-gray-400" },
              amber: { active: "bg-amber-500 text-white shadow-lg shadow-amber-500/30", inactive: "text-gray-400" },
              blue: { active: "bg-blue-500 text-white shadow-lg shadow-blue-500/30", inactive: "text-gray-400" },
            };
            const colors = colorMap[tab.color] || colorMap.cyan;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 min-w-[80px] ${
                  isActive ? colors.active : `${colors.inactive} hover:text-white hover:bg-white/5`
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ═══════ TAB CONTENT with slide animation ═══════ */}
        <div className="overflow-hidden border-t border-white/10">
          <div
            className={`p-3 transition-all duration-200 ease-out ${
              isAnimating
                ? `opacity-0 ${slideDirection === "right" ? "translate-x-4" : "-translate-x-4"}`
                : "opacity-100 translate-x-0"
            }`}
          >

            {/* ═══════ STICKERS TAB ═══════ */}
            {activeProfileTab === "stickers" && (
              <div className="max-h-[60vh] overflow-y-auto">
                {loadingStickers ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Loading stickers...</div>
                ) : stickers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    No stickers yet. Buy some on the Market!
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5 mb-2">MY STICKERS ({stickers.length})</div>
                    <div className="grid grid-cols-3 gap-2">
                      {stickers.map((st) => (
                        <div
                          key={st.id}
                          className={`rounded-lg overflow-hidden border transition-colors ${sellStickerId === st.id ? "border-green-500/50 ring-1 ring-green-500/30" : "border-white/10 hover:border-white/20"} bg-slate-800/50`}
                        >
                          <div className="relative w-full aspect-square overflow-hidden bg-slate-700">
                            {st.image_url ? (
                              <img src={st.image_url} alt={st.pack_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <Package size={24} />
                              </div>
                            )}
                            <Badge className={`absolute top-1 left-1 text-[7px] leading-tight px-1 py-0 ${
                              st.rarity === "Legendary" ? "bg-yellow-500/30 text-yellow-300 border-yellow-500/50" :
                              st.rarity === "Epic" ? "bg-purple-500/30 text-purple-300 border-purple-500/50" :
                              st.rarity === "Rare" ? "bg-blue-500/30 text-blue-300 border-blue-500/50" :
                              "bg-gray-500/30 text-gray-300 border-gray-500/50"
                            }`}>
                              {st.rarity}
                            </Badge>
                          </div>
                          <div className="p-1.5">
                            <div className="text-[10px] font-semibold text-white truncate">#{st.sticker_number}</div>
                            <div className="text-[8px] text-gray-400 truncate">{st.pack_name}</div>
                            {sellStickerId === st.id ? (
                              <button
                                onClick={() => { setSellStickerId(null); setSellPrice(""); }}
                                className="w-full mt-1 text-[9px] text-red-400 font-medium"
                              >
                                ✕ Cancel
                              </button>
                            ) : (
                              <button
                                onClick={() => setSellStickerId(st.id)}
                                className="w-full mt-1 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-medium hover:bg-green-500/30 transition"
                              >
                                Sell
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sell Form - Fixed Bottom Sheet */}
                    {sellStickerId && (
                      <div className="fixed inset-x-0 bottom-0 z-[9999] bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/95 border-t border-green-500/30 p-4 pb-6 backdrop-blur-lg" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-white font-semibold">
                            List sticker #{stickers.find(s => s.id === sellStickerId)?.sticker_number} for sale
                          </span>
                          <button
                            onClick={() => { setSellStickerId(null); setSellPrice(""); }}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition"
                          >
                            <X size={18} className="text-red-400" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            inputMode="decimal"
                            placeholder="Price in TON"
                            value={sellPrice}
                            onChange={(e) => setSellPrice(e.target.value)}
                            className="flex-1 bg-slate-700/80 border border-green-500/30 rounded px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            disabled={sellLoading}
                            onClick={handleListForSale}
                            className="bg-green-500 hover:bg-green-600 text-white h-10 text-xs px-5"
                          >
                            {sellLoading ? "..." : "List"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══════ LISTED TAB ═══════ */}
            {activeProfileTab === "listed" && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Listed for Sale */}
                <div>
                  <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5 mb-1">FOR SALE ({listedStickers.length})</div>
                  {loadingListedStickers ? (
                    <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
                  ) : listedStickers.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      <DollarSign size={24} className="mx-auto mb-2 opacity-30" />
                      No stickers listed for sale
                    </div>
                  ) : (
                    listedStickers.map((st) => (
                      <div key={st.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/30">
                        <div className="w-14 h-14 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-green-500/30">
                          {st.image_url && <img src={st.image_url} alt={st.pack_name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{st.pack_name}</div>
                          <div className="text-[10px] text-gray-400">#{st.sticker_number} • {st.rarity}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="text-xs font-bold text-green-400">{st.price?.toFixed(2)} TON</div>
                          <Button
                            size="sm"
                            onClick={() => handleUnlist(st.id)}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 h-6 text-[10px] px-2"
                          >
                            Unlist
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* NFT Collections */}
                {user?.wallet_address && (
                  <div>
                    <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5 mb-1">NFT COLLECTIONS</div>
                    {loadingNftCollections ? (
                      <div className="text-center py-4 text-gray-400 text-sm">Loading NFTs...</div>
                    ) : (
                      <>
                        {(nftCollections?.available_for_sale?.length || 0) > 0 && (
                          <div className="mb-2">
                            <div className="text-[10px] text-green-400/60 px-1 mb-0.5">AVAILABLE ({nftCollections.available_for_sale.length})</div>
                            {nftCollections.available_for_sale.map((nft, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors">
                                <div className="w-14 h-14 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                                  <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">{nft.name}</div>
                                  <div className="text-[10px] text-gray-400">{nft.collection} • {nft.rarity}</div>
                                </div>
                                <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white h-7 text-[10px] flex-shrink-0">List</Button>
                              </div>
                            ))}
                          </div>
                        )}
                        {(nftCollections?.listed?.length || 0) > 0 && (
                          <div className="mb-2">
                            <div className="text-[10px] text-green-400/60 px-1 mb-0.5">LISTED ({nftCollections.listed.length})</div>
                            {nftCollections.listed.map((nft, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors">
                                <div className="w-14 h-14 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-green-500/30">
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
                        {!nftCollections?.available_for_sale?.length && !nftCollections?.listed?.length && (
                          <div className="text-center py-3 text-gray-400 text-sm">No NFT collections</div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Transaction History */}
                <div>
                  <div className="text-[10px] text-gray-500 font-semibold px-1 py-0.5 mb-1">HISTORY</div>
                  <div className="flex gap-1 mb-2">
                    {["purchases", "sales", "earnings"].map(type => (
                      <button
                        key={type}
                        className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                          activeTransactionTab === type ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                        }`}
                        onClick={() => handleTransactionTab(type)}
                      >
                        {type === "purchases" && <Clock size={11} className="inline mr-1" />}
                        {type === "sales" && <DollarSign size={11} className="inline mr-1" />}
                        {type === "earnings" && <TrendingUp size={11} className="inline mr-1" />}
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                  {loadingTransactions ? (
                    <div className="text-center py-3 text-gray-400 text-sm">{t.profile.loading}</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-3 text-gray-400 text-sm">{t.profile.noTransactions}</div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="p-2 bg-white/5 rounded border border-white/10 text-xs">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-semibold truncate mr-2">{tx.sticker?.pack_name || "Pack Transfer"}</span>
                            <span className={`flex-shrink-0 ${tx.is_seller ? "text-green-400" : "text-red-400"}`}>
                              {tx.is_seller ? "+" : "-"}{tx.amount.toFixed(2)} {tx.currency}
                            </span>
                          </div>
                          {tx.sticker && <p className="text-gray-400 text-[10px]">#{tx.sticker.number} {tx.sticker.rarity}</p>}
                          <p className="text-gray-500 text-[10px]">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══════ REWARDS TAB ═══════ */}
            {activeProfileTab === "rewards" && (
              <div className="space-y-4">
                {/* Daily Reward */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gift size={16} className="text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-white">Daily Reward</div>
                        {dailyStatus && (
                          <div className="text-[10px] text-gray-400">Streak: {dailyStatus.streak} • Day {dailyStatus.day_in_cycle}/7</div>
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
                        className={`h-7 text-[11px] px-3 ${
                          dailyStatus?.available
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white btn-animated"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {claimingDaily ? "..." : dailyStatus?.available ? `Claim ${dailyStatus?.next_reward || 50} SXTON` : "Claimed"}
                      </Button>
                    </div>
                  </div>
                  {dailyStatus && (
                    <div className="flex gap-1 justify-center">
                      {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <div
                          key={day}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold border ${
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

                {/* Promo Code */}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Gem size={14} className="text-purple-400" />
                    <div className="text-xs font-bold text-white">Promo Code</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter code..."
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-700/50 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50 transition min-w-0"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!promoCode.trim()) { toast.error("Enter a code"); return; }
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
                          try { const userRes = await axios.get(`${API}/user/${user.id}`); setUser(userRes.data); } catch (e) {}
                          toast.success(message);
                          setPromoCode("");
                        } catch (error) {
                          toast.error(error.response?.data?.detail || "Invalid code");
                        }
                      }}
                      className="bg-purple-500 hover:bg-purple-600 text-xs h-7 px-3 flex-shrink-0"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ REFERRALS TAB ═══════ */}
            {activeProfileTab === "referrals" && (
              <div className="space-y-4">
                <div className="text-center">
                  <Users size={32} className="mx-auto mb-2 text-blue-400 opacity-60" />
                  <div className="text-xs font-bold text-white mb-0.5">Invite Friends, Earn SXTON!</div>
                  <div className="text-[10px] text-gray-400">500 SXTON for every friend who joins</div>
                </div>

                {loadingReferral ? (
                  <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
                ) : referralInfo ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white/5 rounded-lg py-2">
                        <div className="text-lg font-bold text-blue-400">{referralInfo.referral_count}</div>
                        <div className="text-[10px] text-gray-500">Invited</div>
                      </div>
                      <div className="bg-white/5 rounded-lg py-2">
                        <div className="text-lg font-bold text-purple-400">{referralInfo.total_earned || 0}</div>
                        <div className="text-[10px] text-gray-500">SXTON Earned</div>
                      </div>
                      <div className="bg-white/5 rounded-lg py-2">
                        <div className="text-lg font-bold text-green-400">500</div>
                        <div className="text-[10px] text-gray-500">Per Friend</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2 border border-white/10">
                      <span className="text-[10px] text-gray-400 truncate flex-1 font-mono">
                        {referralInfo.referral_link}
                      </span>
                      <button onClick={handleCopyReferral} className="p-1.5 hover:bg-white/10 rounded transition flex-shrink-0">
                        <Copy size={14} className="text-cyan-400" />
                      </button>
                      <button onClick={handleShareReferral} className="p-1.5 hover:bg-white/10 rounded transition flex-shrink-0">
                        <Share2 size={14} className="text-blue-400" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">Referral info unavailable</div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;