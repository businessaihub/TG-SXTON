import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { CheckCircle, Clock, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { translations } from "../utils/translations";

const Quests = ({ user, setUser, language }) => {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [claiming, setClaiming] = useState(null);
  const t = translations[language] || translations.en;

  useEffect(() => {
    if (user) {
      fetchUserQuests();
    }
  }, [user, language]);

  const fetchUserQuests = async () => {
    try {
      const response = await axios.get(`${API}/user/${user.id}/quests`);
      setQuests(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching quests:", error);
      setLoading(false);
    }
  };

  const handleCompleteQuest = async (questId) => {
    try {
      await axios.post(`${API}/quest/${questId}/complete`, { user_id: user.id });
      toast.success(t.quests?.completed || "Quest completed!");
      fetchUserQuests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to complete quest");
    }
  };

  const handleClaimReward = async (questId, quest) => {
    setClaiming(questId);
    try {
      const response = await axios.post(`${API}/quest/${questId}/claim-reward`, {
        user_id: user.id
      });
      toast.success(response.data.message);
      
      // Update user SXTON balance (all quests give SXTON)
      setUser({ ...user, sxton_points: (user.sxton_points || 0) + quest.reward_amount });
      
      fetchUserQuests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  const getRewardColor = (type) => {
    switch (type) {
      case "SXTON": return "text-purple-400";
      case "Stars": return "text-yellow-400";
      case "TON": return "text-cyan-400";
      case "Points": return "text-pink-400";
      default: return "text-gray-400";
    }
  };

  const getRewardBgColor = (type) => {
    switch (type) {
      case "SXTON": return "bg-purple-500/20";
      case "Stars": return "bg-yellow-500/20";
      case "TON": return "bg-cyan-500/20";
      case "Points": return "bg-pink-500/20";
      default: return "bg-gray-500/20";
    }
  };

  const getQuestTypeLabel = (type) => {
    switch (type) {
      case "link": return "📎 Follow Link";
      case "referral": return "👥 Referral";
      case "join_chat": return "💬 Join Chat";
      case "on_chain": return "⛓️ On-chain";
      case "follow": return "📱 Follow Channel";
      case "purchase": return "🛒 Purchase";
      default: return type;
    }
  };

  const activeQuests = quests.filter(q => !q.user_progress?.is_completed);
  const completedQuests = quests.filter(q => q.user_progress?.is_completed);

  const renderQuestCard = (quest) => {
    const progress = quest.user_progress || {};
    const isCompleted = progress.is_completed;
    const rewardClaimed = progress.reward_claimed;

    return (
      <div key={quest.id} className="glass-card p-4 border border-white/10 relative overflow-hidden">
        <div className="cosmic-particles"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">{quest.title}</h3>
              <p className="text-sm text-gray-400">{quest.description}</p>
            </div>
            
            {isCompleted && (
              <CheckCircle className="text-green-400 flex-shrink-0 ml-2" size={20} />
            )}
          </div>

          {/* Quest Type Badge */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
              {getQuestTypeLabel(quest.quest_type)}
            </Badge>
            {quest.is_daily && (
              <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                Daily
              </Badge>
            )}
          </div>

          {/* Reward */}
          <div className={`${getRewardBgColor(quest.reward_type)} rounded-lg p-3 mb-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={16} className={getRewardColor(quest.reward_type)} />
                <span className="text-sm text-gray-300">Reward:</span>
              </div>
              <span className={`font-bold ${getRewardColor(quest.reward_type)}`}>
                {quest.reward_amount} {quest.reward_type}
              </span>
            </div>
          </div>

          {/* Action Button */}
          {!isCompleted ? (
            <Button
              onClick={() => handleCompleteQuest(quest.id)}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white text-sm"
              disabled={loading}
            >
              <Clock size={14} className="mr-1" />
              {t.quests?.complete || "Complete Quest"}
            </Button>
          ) : !rewardClaimed ? (
            <Button
              onClick={() => handleClaimReward(quest.id, quest)}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm"
              disabled={claiming === quest.id}
            >
              <Gift size={14} className="mr-1" />
              {claiming === quest.id ? "Claiming..." : (t.quests?.claimReward || "Claim Reward")}
            </Button>
          ) : (
            <Button
              disabled
              className="w-full bg-gray-500/20 text-gray-400 text-sm"
            >
              <CheckCircle size={14} className="mr-1" />
              {t.quests?.rewarded || "Rewarded"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-purple-400" size={24} />
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
          {t.quests?.title || "Quests"}
        </h2>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active ({activeQuests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedQuests.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Quests */}
      <div className="space-y-3">
        {filter === "active" ? (
          activeQuests.length > 0 ? (
            activeQuests.map(renderQuestCard)
          ) : (
            <div className="text-center py-8 text-gray-400">
              {t.quests?.noActive || "No active quests. Check back later!"}
            </div>
          )
        ) : (
          completedQuests.length > 0 ? (
            completedQuests.map(renderQuestCard)
          ) : (
            <div className="text-center py-8 text-gray-400">
              {t.quests?.noCompleted || "No completed quests yet."}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Quests;
