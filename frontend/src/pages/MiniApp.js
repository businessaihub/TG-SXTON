import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import SplashScreen from "../components/SplashScreen";
import Marketplace from "../components/Marketplace";
import Activity from "../components/Activity";
import Hot from "../components/Hot";
import Profile from "../components/Profile";
import Quests from "../components/Quests";
import Game from "../components/Game";
import BottomNav from "../components/BottomNav";
import { Home, Activity as ActivityIcon, Flame, User, Shield, Sparkles, Gamepad2 } from "lucide-react";

const MiniApp = ({ isAdmin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splash_shown"));
  const [splashTimerDone, setSplashTimerDone] = useState(false);
  const [currentTab, setCurrentTab] = useState("marketplace");
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'en';
  });

  useEffect(() => {
    const initUser = async () => {
      try {
        // Try to get real Telegram WebApp data
        const tg = window.Telegram?.WebApp;
        if (tg) {
          tg.expand();
          tg.enableClosingConfirmation();
        }
        const tgUser = tg?.initDataUnsafe?.user;

        let telegramId, username;

        if (tgUser?.id) {
          // Real Telegram environment
          telegramId = String(tgUser.id);
          username = tgUser.username || tgUser.first_name || "tg_user";
        } else {
          // Browser testing — use stable ID from localStorage
          telegramId = localStorage.getItem("tg_sxton_telegram_id");
          if (!telegramId) {
            telegramId = "dev_" + Math.random().toString(36).substr(2, 9);
            localStorage.setItem("tg_sxton_telegram_id", telegramId);
          }
          username = "dev_user";
        }

        const response = await axios.post(`${API}/auth/telegram`, {
          telegram_id: telegramId,
          username: username
        });
        setUser(response.data.user);
      } catch (error) {
        console.error("Error initializing user:", error);
        setUser({
          id: "offline_user",
          username: "offline",
          ton_balance: 0,
          stars_balance: 0,
          sxton_points: 0,
          referral_count: 0
        });
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
    
    // Send language preference to backend
    if (user && user.id) {
      axios.put(`${API}/user/${user.id}/language?language=${language}`).catch(err => {
        console.error("Error updating language on backend:", err);
      });
    }
  }, [language, user]);

  useEffect(() => {
    const path = location.pathname.substring(1) || "marketplace";
    setCurrentTab(path);
  }, [location]);

  const tabs = [
    { id: "marketplace", label: "Marketplace", icon: Home },
    { id: "activity", label: "Activity", icon: ActivityIcon },
    { id: "hot", label: "Hot", icon: Flame },
    { id: "game", label: "Game", icon: Gamepad2 },
    { id: "profile", label: "Profile", icon: User },
    { id: "quests", label: "Quests", icon: Sparkles },
    // { id: "roulette", label: "Roulette", icon: Disc3 }, // TODO: Enable when roulette is ready
  ];

  if (isAdmin) {
    tabs.push({ id: "admin", label: "Admin", icon: Shield });
  }

  const handleTabChange = (tabId) => {
    if (tabId === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate(`/${tabId}`);
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear user state
    setUser(null);
    
    // Redirect to marketplace
    navigate("/marketplace");
  };

  const renderContent = () => {
    switch (currentTab) {
      case "marketplace":
        return <Marketplace user={user} language={language} />;
      case "activity":
        return <Activity language={language} user={user} />;
      case "hot":
        return <Hot language={language} />;
      case "game":
        return <Game user={user} language={language} />;
      case "profile":
        return <Profile user={user} setUser={setUser} language={language} setLanguage={setLanguage} onLogout={handleLogout} />;
      case "quests":
        return <Quests user={user} setUser={setUser} language={language} />;
      // case "roulette":
      //   return <Roulette user={user} setUser={setUser} language={language} />; // TODO: Enable when roulette is ready
      default:
        return <Marketplace user={user} language={language} />;
    }
  };

  const handleSplashFinish = useCallback(() => {
    setSplashTimerDone(true);
  }, []);

  // Close splash only when BOTH timer done AND user loaded
  useEffect(() => {
    if (splashTimerDone && user) {
      sessionStorage.setItem("splash_shown", "1");
      setShowSplash(false);
    }
  }, [splashTimerDone, user]);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f]"
         style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="w-full max-w-lg mx-auto px-3">
        {renderContent()}
      </div>
      
      <BottomNav tabs={tabs} currentTab={currentTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default MiniApp;