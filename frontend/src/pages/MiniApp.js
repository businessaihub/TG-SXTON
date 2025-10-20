import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import Marketplace from "../components/Marketplace";
import Activity from "../components/Activity";
import Hot from "../components/Hot";
import Profile from "../components/Profile";
import Roulette from "../components/Roulette";
import BottomNav from "../components/BottomNav";
import LanguageSelector from "../components/LanguageSelector";
import { Home, Activity as ActivityIcon, Flame, User, Disc3, Shield } from "lucide-react";

const MiniApp = ({ isAdmin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState("marketplace");
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    // Initialize user (mock Telegram auth)
    const initUser = async () => {
      try {
        const telegramId = "user_" + Math.random().toString(36).substr(2, 9);
        const response = await axios.post(`${API}/auth/telegram`, {
          telegram_id: telegramId,
          username: "demo_user"
        });
        setUser(response.data.user);
        
        // Mock balance for testing
        await axios.post(`${API}/wallet/mock-balance`, {
          user_id: response.data.user.id,
          ton: 100,
          stars: 500,
          points: 1000
        });
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    const path = location.pathname.substring(1) || "marketplace";
    setCurrentTab(path);
  }, [location]);

  const tabs = [
    { id: "marketplace", label: "Marketplace", icon: Home },
    { id: "activity", label: "Activity", icon: ActivityIcon },
    { id: "hot", label: "Hot", icon: Flame },
    { id: "profile", label: "Profile", icon: User },
    { id: "roulette", label: "Roulette", icon: Disc3 },
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

  const renderContent = () => {
    switch (currentTab) {
      case "marketplace":
        return <Marketplace user={user} language={language} />;
      case "activity":
        return <Activity language={language} />;
      case "hot":
        return <Hot language={language} />;
      case "profile":
        return <Profile user={user} setUser={setUser} language={language} setLanguage={setLanguage} />;
      case "roulette":
        return <Roulette user={user} setUser={setUser} language={language} />;
      default:
        return <Marketplace user={user} language={language} />;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] pb-20">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector language={language} setLanguage={setLanguage} />
      </div>
      
      <div className="max-w-md mx-auto">
        {renderContent()}
      </div>
      
      <BottomNav tabs={tabs} currentTab={currentTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default MiniApp;