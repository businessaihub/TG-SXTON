import { useState } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Wallet, LogOut, Clock, List, Star, Shield, Package, TrendingUp, DollarSign, Bell, Globe, Gem, Gift } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const Profile = ({ user, setUser, language, setLanguage, onLogout }) => {
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
  
  // Game Balance
  const [gameBalance, setGameBalance] = useState(0);
  const [loadingGameBalance, setLoadingGameBalance] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  
  // Daily Login Reward
  const [dailyRewardStatus, setDailyRewardStatus] = useState(null);
  const [loadingDailyReward, setLoadingDailyReward] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  
  // Referral System
  const [referralCode, setReferralCode] = useState(null);
  const [referralStats, setReferralStats] = useState(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  
  const t = translations[language] || translations.en;

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

  // Fetch seller stats
  useEffect(() => {
    const fetchSellerStats = async () => {
      if (!user || !user.id) return;
      setLoadingSellerStats(true);
      try {
        const res = await API.get(`/user/${user.id}/seller-stats`);
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

  // Fetch transactions by type
  const fetchTransactions = async (type) => {
    if (!user || !user.id) return;
    setLoadingTransactions(true);
    try {
      const res = await API.get(`/user/${user.id}/transactions?transaction_type=${type}`);
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
        const res = await API.get(`/user/${user.id}/listed-stickers`);
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
        const res = await API.get(`/user/${user.id}/nft-collections`);
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

  // Fetch game balance
  useEffect(() => {
    const fetchGameBalance = async () => {
      if (!user || !user.id) return;
      setLoadingGameBalance(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/game-balance`);
        setGameBalance(res.data.balance || 0);
        
        // Fetch withdrawal history
        const withdrawRes = await axios.get(`${API}/user/${user.id}/withdrawals`);
        setWithdrawHistory(withdrawRes.data.withdrawals || []);
      } catch (e) {
        console.error('Failed to fetch game balance', e);
        setGameBalance(0);
      } finally {
        setLoadingGameBalance(false);
      }
    };
    fetchGameBalance();
  }, [user?.id]);

  // Fetch daily reward status
  useEffect(() => {
    const fetchDailyReward = async () => {
      if (!user || !user.id) return;
      setLoadingDailyReward(true);
      try {
        const res = await axios.get(`${API}/user/${user.id}/daily-reward-status`);
        setDailyRewardStatus(res.data);
      } catch (e) {
        console.error('Failed to fetch daily reward status', e);
      } finally {
        setLoadingDailyReward(false);
      }
    };
    fetchDailyReward();
  }, [user?.id]);

  // Fetch referral code and stats
  useEffect(() => {
    const fetchReferral = async () => {
      if (!user || !user.id) return;
      setLoadingReferral(true);
      try {
        const [codeRes, statsRes] = await Promise.all([
          axios.get(`${API}/user/${user.id}/referral-code`),
          axios.get(`${API}/user/${user.id}/referral-stats`)
        ]);
        
        setReferralCode(codeRes.data);
        setReferralStats(statsRes.data);
      } catch (e) {
        console.error('Failed to fetch referral data', e);
      } finally {
        setLoadingReferral(false);
      }
    };
    fetchReferral();
  }, [user?.id]);

  // Claim daily reward
  const handleClaimDailyReward = async () => {
    try {
      setClaimingReward(true);
      const res = await axios.post(`${API}/user/${user.id}/claim-daily-reward`);
      
      // Update balance
      setGameBalance(res.data.new_balance);
      
      // Update reward status
      const statusRes = await axios.get(`${API}/user/${user.id}/daily-reward-status`);
      setDailyRewardStatus(statusRes.data);
      
      toast.success(`🎁 +${res.data.reward} TON! Streak: Day ${res.data.new_streak}/7`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to claim reward");
    } finally {
      setClaimingReward(false);
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    if (amount > 10000) {
      toast.error("Maximum deposit is 10,000 TON");
      return;
    }
    
    try {
      const res = await axios.post(`${API}/user/${user.id}/deposit`, { amount });
      setGameBalance(res.data.new_balance);
      setDepositAmount("");
      setShowDepositModal(false);
      toast.success(`Deposited ${amount} TON to Game Balance`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Deposit failed");
    }
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    if (amount > gameBalance) {
      toast.error("Insufficient balance");
      return;
    }
    
    try {
      const res = await axios.post(`${API}/user/${user.id}/withdraw`, { amount });
      setGameBalance(prev => prev - amount);
      setWithdrawAmount("");
      setShowWithdrawModal(false);
      
      // Refresh withdrawal history
      const withdrawRes = await axios.get(`${API}/user/${user.id}/withdrawals`);
      setWithdrawHistory(withdrawRes.data.withdrawals || []);
      
      toast.success(`Withdrawal requested for ${amount} TON (${res.data.processing_hours}h processing)`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Withdrawal failed");
    }
  };

  const handleTransactionTab = (type) => {
    setActiveTransactionTab(type);
    fetchTransactions(type);
  };

  const handleToggleNotifications = async (enabled) => {
    if (!user || !user.id) return;
    try {
      const res = await API.put(`/user/${user.id}/settings`, {
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
      {/* Header - Telegram Profile */}
      <div className="pt-4 glass-card p-6 rounded-lg border border-white/10">
        <div className="flex items-start gap-4">
          {/* Left: Avatar + Statistics */}
          <div className="flex flex-col items-center gap-3">
            {/* Telegram Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">👤</span>
            </div>
            
            {/* Statistics under avatar */}
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{stickers.length}</div>
              <div className="text-xs text-gray-400">{t.profile.purchased}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{sellerStats?.total_sold || totalSold}</div>
              <div className="text-xs text-gray-400">{t.profile.sold}</div>
            </div>
          </div>
          
          {/* Center: User Info */}
          <div className="flex-1">
            <h1 className="text-xl font-bold neon-cyan mb-1" style={{ fontFamily: 'Space Grotesk' }}>
              {user?.username || "Anonymous"}
            </h1>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Globe size={14} className="text-cyan-400" />
                <span>ID: {user?.id?.substring(0, 8) || "N/A"}...</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Shield size={14} className="text-green-400" />
                <span className="capitalize">{t.profile.sellerStatus}: <span className="text-green-400 font-semibold">{sellerStatus}</span></span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Star size={14} className="text-yellow-400" />
                <span>{t.profile.sellerRating}: <span className="text-yellow-400 font-semibold">{sellerRating} ⭐</span></span>
              </div>
            </div>
          </div>

          {/* Right: Language Selector Icon */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-white/10 rounded-lg transition h-fit">
                <Globe size={24} className="text-cyan-400 hover:text-cyan-300" />
              </button>
            </DropdownMenuTrigger>>
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

        {/* Promo Code Row */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <Gem size={14} className="text-purple-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Promo Code..."
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="flex-1 bg-slate-700/50 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50 transition"
          />
          <Button
            size="sm"
            onClick={async () => {
              if (!promoCode.trim()) {
                toast.error("Enter a code");
                return;
              }
              try {
                const response = await axios.post(`${API}/promo-codes/validate?code=${promoCode}`);
                
                // Show type-specific success message
                let message = "Code applied!";
                if (response.data.promoType === "discount") {
                  message = `${response.data.discount}${response.data.discountType === "percent" ? "%" : " TON"} discount applied!`;
                } else if (response.data.promoType === "sxton_token") {
                  message = `${response.data.sxtonAmount} SXTON tokens added to your balance!`;
                } else if (response.data.promoType === "guaranteed_sticker") {
                  const rarity = response.data.stickerRarity.charAt(0).toUpperCase() + response.data.stickerRarity.slice(1);
                  message = `${rarity} sticker reward granted!`;
                }
                
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

      {/* Daily Login Reward Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-green-400" size={24} />
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              🎁 Daily Login Bonus
            </h2>
          </div>
        </div>
        
        {loadingDailyReward ? (
          <div className="text-center py-4 text-gray-400">Loading...</div>
        ) : dailyRewardStatus ? (
          <div className="space-y-4">
            {/* Streak Display */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-2">Current Streak</div>
                <div className="text-5xl font-bold text-green-400 mb-2">
                  {dailyRewardStatus.streak}/7 🔥
                </div>
                <div className="text-sm text-gray-300">
                  Next reward: {dailyRewardStatus.reward.toFixed(2)} TON
                </div>
              </div>
            </div>

            {/* Streak Progress Bar */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 font-semibold">Progression</div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${(dailyRewardStatus.streak / 7) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Day 1</span>
                <span>Day 7</span>
              </div>
            </div>

            {/* Streak Rewards List */}
            <div className="text-xs text-gray-400 space-y-1">
              <div className="font-semibold mb-2">Rewards by Day:</div>
              <div className="grid grid-cols-7 gap-1">
                {dailyRewardStatus.streak_rewards.map((amt, idx) => (
                  <div 
                    key={idx}
                    className={`text-center p-2 rounded ${
                      idx < dailyRewardStatus.streak 
                        ? "bg-green-500/20 border border-green-500/50 text-green-300" 
                        : "bg-slate-700/50 border border-slate-600/50 text-gray-400"
                    }`}
                  >
                    <div className="text-xs font-bold">{idx + 1}</div>
                    <div className="text-xs">{amt.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Claim Button */}
            <Button
              onClick={handleClaimDailyReward}
              disabled={!dailyRewardStatus.can_claim || claimingReward}
              className={`w-full ${
                dailyRewardStatus.can_claim
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-slate-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              {dailyRewardStatus.can_claim ? (
                <>
                  🎁 Claim Reward ({dailyRewardStatus.reward.toFixed(2)} TON)
                </>
              ) : (
                <>
                  ✓ Already claimed today
                </>
              )}
            </Button>

            {!dailyRewardStatus.can_claim && dailyRewardStatus.time_until_next > 0 && (
              <div className="text-center text-xs text-gray-400">
                Next reward in {Math.floor(dailyRewardStatus.time_until_next / 3600)}h {Math.floor((dailyRewardStatus.time_until_next % 3600) / 60)}m
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Referral Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              🎯 Referral Program
            </h2>
          </div>
        </div>
        
        {loadingReferral ? (
          <div className="text-center py-4 text-gray-400">Loading...</div>
        ) : referralCode ? (
          <div className="space-y-4">
            {/* Referral Code */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Your Referral Code</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralCode.referral_code}
                  readOnly
                  className="flex-1 bg-slate-800 border border-blue-500/30 rounded px-3 py-2 text-white font-mono font-bold text-center tracking-widest"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(referralCode.referral_code);
                    toast.success("Code copied!");
                  }}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Copy
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">Share with friends to earn 5% from their deposits</div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 border border-blue-500/30 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Total Referrals</div>
                <div className="text-2xl font-bold text-blue-400">{referralStats?.total_referrals || 0}</div>
              </div>
              <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Earned from Referrals</div>
                <div className="text-2xl font-bold text-green-400">{(referralStats?.total_earned || 0).toFixed(2)}</div>
              </div>
            </div>
            
            {/* Referral List */}
            {referralStats?.referral_list && referralStats.referral_list.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-400 font-semibold">Referred Users</div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {referralStats.referral_list.map((ref, idx) => (
                    <div key={idx} className="bg-slate-800/50 rounded p-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-mono">{ref.referred_user_id.slice(0, 8)}...</span>
                        <span className="text-green-400 font-semibold">+{ref.earned.toFixed(2)} TON</span>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">Deposit: {ref.deposit.toFixed(2)} TON</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Game Balance Section */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="text-yellow-400" size={24} />
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
              🎮 Game Balance
            </h2>
          </div>
        </div>
        
        {/* Balance Display */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-1">Available Balance</div>
            <div className="text-4xl font-bold text-yellow-400">
              {loadingGameBalance ? "..." : `${gameBalance.toFixed(2)}`}
            </div>
            <div className="text-xs text-gray-400 mt-1">TON (for games only)</div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowDepositModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            💰 Deposit
          </Button>
          <Button
            onClick={() => setShowWithdrawModal(true)}
            variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            disabled={gameBalance < 0.1}
          >
            🔄 Withdraw
          </Button>
        </div>
        
        {/* Recent Withdrawals */}
        {withdrawHistory.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-400 font-semibold">Recent Withdrawals</div>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {withdrawHistory.slice(0, 5).map((w, idx) => (
                <div key={idx} className="bg-slate-800/50 rounded p-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-mono">{w.amount.toFixed(2)} TON</span>
                    <Badge 
                      className={`text-xs ${
                        w.status === "completed" ? "bg-green-500/30 text-green-300" :
                        w.status === "approved" ? "bg-blue-500/30 text-blue-300" :
                        w.status === "rejected" ? "bg-red-500/30 text-red-300" :
                        "bg-yellow-500/30 text-yellow-300"
                      }`}
                    >
                      {w.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {w.processing_delay_hours > 0 && `~${w.processing_delay_hours}h delay`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm bg-slate-900 border-cyan-500/30 space-y-4 p-6">
            <div className="text-xl font-bold text-cyan-400">💰 Deposit to Game Balance</div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Amount (TON)</div>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                max="10000"
                step="0.01"
                className="w-full bg-slate-800 border border-cyan-500/20 rounded px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
              />
              <div className="text-xs text-gray-500">Max: 10,000 TON per deposit</div>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
              <div className="text-xs text-yellow-400 font-semibold">ℹ️ Game Balance is for games only</div>
              <div className="text-xs text-gray-400 mt-1">Not for marketplace transactions</div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleDeposit}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                Confirm Deposit
              </Button>
              <Button
                onClick={() => setShowDepositModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm bg-slate-900 border-cyan-500/30 space-y-4 p-6">
            <div className="text-xl font-bold text-cyan-400">🔄 Withdraw from Game Balance</div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Amount (TON)</div>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                max={gameBalance.toFixed(2)}
                step="0.01"
                className="w-full bg-slate-800 border border-cyan-500/20 rounded px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
              />
              <div className="text-xs text-gray-500">Available: {gameBalance.toFixed(2)} TON</div>
            </div>
            
            {withdrawAmount && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white font-semibold">{parseFloat(withdrawAmount).toFixed(2)} TON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee (1%):</span>
                  <span className="text-white font-semibold">{(parseFloat(withdrawAmount) * 0.01).toFixed(4)} TON</span>
                </div>
                <div className="border-t border-blue-500/20 pt-2 mt-2 flex justify-between font-semibold">
                  <span className="text-gray-300">You receive:</span>
                  <span className="text-green-400">{(parseFloat(withdrawAmount) * 0.99).toFixed(2)} TON</span>
                </div>
                <div className="text-xs text-blue-300 mt-3">
                  ⏱️ Processing: 
                  {parseFloat(withdrawAmount) < 1 ? " Instant" :
                   parseFloat(withdrawAmount) <= 5 ? " ~6 hours" :
                   parseFloat(withdrawAmount) <= 20 ? " ~24 hours" :
                   " ~48 hours"}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={handleWithdraw}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                disabled={!withdrawAmount}
              >
                Confirm Withdraw
              </Button>
              <Button
                onClick={() => setShowWithdrawModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

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

      {/* Deposit/Withdraw */}
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

      {/* Purchase History */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-cyan-400" />
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
            {t.profile.transactionHistory}
          </h3>
        </div>
        <div className="space-y-2 mb-4">
          <Button 
            variant={activeTransactionTab === "purchases" ? "default" : "outline"}
            className="w-full justify-start text-sm" 
            data-testid="history-purchases-btn"
            onClick={() => handleTransactionTab("purchases")}
          >
            <Clock size={16} className="mr-2" />
            {t.profile.purchases}
          </Button>
          <Button 
            variant={activeTransactionTab === "sales" ? "default" : "outline"}
            className="w-full justify-start text-sm" 
            data-testid="history-sales-btn"
            onClick={() => handleTransactionTab("sales")}
          >
            <DollarSign size={16} className="mr-2" />
            {t.profile.sales}
          </Button>
          <Button 
            variant={activeTransactionTab === "earnings" ? "default" : "outline"}
            className="w-full justify-start text-sm" 
            data-testid="history-earnings-btn"
            onClick={() => handleTransactionTab("earnings")}
          >
            <TrendingUp size={16} className="mr-2" />
            {t.profile.earnings}
          </Button>
        </div>
        
        {/* Transactions List */}
        {loadingTransactions ? (
          <div className="text-center py-6 text-gray-400 text-sm">Завантаження...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Немає транзакцій</div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-3 bg-white/5 rounded border border-white/10 text-xs">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold">
                    {tx.sticker?.pack_name || "Pack Transfer"}
                  </span>
                  <span className={tx.is_seller ? "text-green-400" : "text-red-400"}>
                    {tx.is_seller ? "+" : "-"}{tx.amount.toFixed(2)} {tx.currency}
                  </span>
                </div>
                {tx.sticker && (
                  <p className="text-gray-400">#{tx.sticker.number} {tx.sticker.rarity}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">{new Date(tx.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Assets - Unified Stickers & Collections */}
      <div className="glass-card p-6">
        {/* Segmented Tabs */}
        <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-lg border border-white/10">
          <button
            onClick={() => setActiveAssetTab("stickers")}
            className={`px-4 py-2 rounded text-sm font-semibold transition-all ${
              activeAssetTab === "stickers"
                ? "bg-cyan-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            My Stickers
          </button>
          <button
            onClick={() => setActiveAssetTab("collections")}
            className={`px-4 py-2 rounded text-sm font-semibold transition-all ${
              activeAssetTab === "collections"
                ? "bg-blue-500 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            My Collections
          </button>
        </div>

        {/* My Stickers Tab - Compact List */}
        {activeAssetTab === "stickers" && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {loadingStickers || loadingListedStickers ? (
              <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
            ) : (stickers.length === 0 && listedStickers.length === 0) ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                No stickers yet. <a href="#/marketplace" className="text-cyan-400 hover:underline">Buy some!</a>
              </div>
            ) : (
              <>
                {/* Purchased Stickers */}
                {stickers.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 font-semibold px-2 py-1">PURCHASED ({stickers.length})</div>
                    {stickers.map((st) => (
                      <div key={st.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-white/10">
                        <div className="w-32 h-32 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                          <img src={st.image_url} alt={st.pack_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{st.pack_name}</div>
                          <div className="text-xs text-gray-400">#{st.sticker_number} • {st.rarity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Listed Stickers */}
                {listedStickers.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 font-semibold px-2 py-1">FOR SALE ({listedStickers.length})</div>
                    {listedStickers.map((st) => (
                      <div key={st.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/30">
                        <div className="w-32 h-32 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-green-500/30">
                          <img src={st.image_url} alt={st.pack_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{st.pack_name}</div>
                          <div className="text-xs text-gray-400">#{st.sticker_number} • {st.rarity}</div>
                        </div>
                        <div className="text-xs font-bold text-green-400">{st.price.toFixed(2)} TON</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* My Collections Tab - Compact List */}
        {activeAssetTab === "collections" && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {!user?.wallet_address ? (
              <div className="text-center py-8 text-gray-400 text-sm border border-blue-500/30 rounded p-4">
                <p className="mb-2">🔗 Connect your wallet to see NFT collections</p>
                <p className="text-xs text-gray-500">NFT from other markets will appear here</p>
              </div>
            ) : loadingNftCollections ? (
              <div className="text-center py-6 text-gray-400 text-sm">Loading NFTs...</div>
            ) : (
              <>
                {/* Available for Sale */}
                {(nftCollections?.available_for_sale?.length || 0) > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 font-semibold px-2 py-1">AVAILABLE ({nftCollections.available_for_sale.length})</div>
                    {nftCollections.available_for_sale.map((nft, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/30">
                        <div className="w-32 h-32 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{nft.name}</div>
                          <div className="text-xs text-gray-400">{nft.collection} • {nft.rarity}</div>
                        </div>
                        <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white h-8 text-xs flex-shrink-0">
                          List
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Listed */}
                {(nftCollections?.listed?.length || 0) > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 font-semibold px-2 py-1">LISTED ({nftCollections.listed.length})</div>
                    {nftCollections.listed.map((nft, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-green-500/30">
                        <div className="w-32 h-32 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-green-500/30">
                          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{nft.name}</div>
                          <div className="text-xs text-gray-400">{nft.collection} • {nft.rarity}</div>
                        </div>
                        <div className="text-xs font-bold text-green-400 flex-shrink-0">{nft.price} {nft.currency}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Not Whitelisted - Collapsible */}
                {(nftCollections?.not_whitelisted?.length || 0) > 0 && (
                  <details className="mt-4 text-xs text-gray-500">
                    <summary className="font-semibold px-2 py-1 cursor-pointer hover:text-gray-400 transition-colors">⊕ NOT SUPPORTED ({nftCollections.not_whitelisted.length})</summary>
                    <div className="mt-2 space-y-1">
                      {nftCollections.not_whitelisted.map((nft, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 opacity-50 border border-yellow-500/20 rounded">
                          <div className="w-20 h-20 rounded flex-shrink-0 overflow-hidden bg-slate-700 border border-white/10">
                            <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{nft.name}</div>
                            <div className="text-xs text-yellow-400">Unsupported collection</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                
                {!nftCollections?.available_for_sale?.length && !nftCollections?.listed?.length && !nftCollections?.not_whitelisted?.length && (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    No NFT collections in your wallet
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Settings & Support */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>
          {t.profile.settings}
        </h3>
        <div className="space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Bell size={16} className="mr-2" />
                {t.profile.notifications}: {notificationsEnabled ? "🔔 On" : "🔕 Off"}
              </Button>
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
          <Button variant="outline" className="w-full justify-start text-sm text-red-400 hover:text-red-300" onClick={onLogout}>
            <LogOut size={16} className="mr-2" />
            {t.profile.logout}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;