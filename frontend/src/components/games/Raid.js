import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Users, Plus, Zap, Trophy, TrendingUp } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";

const Raid = ({ user, language }) => {
  const [raids, setRaids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingRaid, setCreatingRaid] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [entryCost] = useState(0.1);

  const texts = {
    en: {
      title: "⚔️ Raid",
      description: "Join forces with other players. Winner takes all!",
      activeRaids: "Active Raids",
      createRaid: "Create Raid",
      joinRaid: "Join Raid",
      pool: "Pool",
      players: "Players",
      reward: "🏆 Epic Sticker",
      joiningRaid: "Joining...",
      creatingRaid: "Creating...",
      joined: "Joined raid!",
      created: "Raid created!",
      wait: "Waiting for more players",
      full: "Raid Full",
      winner: "🎉 You won!",
      cost: "Entry Cost",
      ton: "TON",
    },
    uk: {
      title: "⚔️ Рейд",
      description: "Об'єднайся з іншими гравцями. Переможець бере все!",
      activeRaids: "Активні Рейди",
      createRaid: "Створити Рейд",
      joinRaid: "Приєднатись",
      pool: "Пул",
      players: "Гравці",
      reward: "🏆 Епік Стікер",
      joiningRaid: "Приєднуюсь...",
      creatingRaid: "Створюю...",
      joined: "Приєднався до рейду!",
      created: "Рейд створено!",
      wait: "Чекаємо більше гравців",
      full: "Рейд Повний",
      winner: "🎉 Ти переміг!",
      cost: "Вартість входу",
      ton: "TON",
    },
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    loadRaids();
  }, [user?.id]);

  const loadRaids = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/game/raid/list`);
      setRaids(res.data.raids || []);
    } catch (err) {
      console.error("Error loading raids:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRaid = async () => {
    try {
      setCreatingRaid(true);
      const res = await axios.post(`${API}/game/raid/create`, {
        creator_id: user.id,
        entry_cost: entryCost,
      });
      toast.success(t.created);
      setShowCreate(false);
      await loadRaids();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create raid");
    } finally {
      setCreatingRaid(false);
    }
  };

  const handleJoinRaid = async (raidId) => {
    try {
      await axios.post(`${API}/game/raid/join`, {
        user_id: user.id,
        raid_id: raidId,
      });
      toast.success(t.joined);
      await loadRaids();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to join raid");
    }
  };

  const handleFinalizeRaid = async (raidId) => {
    try {
      const res = await axios.post(`${API}/game/raid/finalize`, {
        raid_id: raidId,
      });
      if (res.data.winner_id === user.id) {
        toast.success(t.winner);
      } else {
        toast.info("Raid finalized");
      }
      await loadRaids();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to finalize raid");
    }
  };

  if (loading) {
    return <div className="animate-spin">⏳</div>;
  }

  return (
    <div className="max-w-2xl">
      <Card className="p-6 mb-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚔️</div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-gray-600">{t.description}</p>
        </div>

        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t.createRaid}
        </Button>
      </Card>

      {showCreate && (
        <Card className="p-6 mb-6 bg-blue-50">
          <h3 className="font-bold text-lg mb-4">⚙️ {t.createRaid}</h3>
          <div className="bg-white p-4 rounded mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">{t.cost}</span>
              <span className="font-bold">
                {entryCost} {t.ton}
              </span>
            </div>
          </div>
          <Button
            onClick={handleCreateRaid}
            disabled={creatingRaid}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {creatingRaid ? t.creatingRaid : "✓ " + t.createRaid}
          </Button>
        </Card>
      )}

      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        {t.activeRaids}
      </h3>

      {raids.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          No active raids. Create one!
        </Card>
      ) : (
        <div className="space-y-4">
          {raids.map((raid) => {
            const isFull = raid.participants.length >= 10;
            const isParticipant = raid.participants.includes(user.id);

            return (
              <Card key={raid.id} className="p-4 border-2 border-purple-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">{t.players}</div>
                    <div className="flex items-center gap-2 text-lg font-bold">
                      <Users className="w-5 h-5" />
                      {raid.participants.length}/10
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">{t.pool}</div>
                    <div className="text-lg font-bold">
                      {(raid.total_pool || 0).toFixed(2)} {t.ton}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <Badge variant="secondary" className="mb-2">
                    {t.reward}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {!isFull && !isParticipant && raid.status === "active" && (
                    <Button
                      onClick={() => handleJoinRaid(raid.id)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {t.joinRaid}
                    </Button>
                  )}

                  {isFull && raid.status === "active" && (
                    <>
                      <Button
                        onClick={() => handleFinalizeRaid(raid.id)}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Finalize & Pick Winner
                      </Button>
                    </>
                  )}

                  {isFull && (
                    <Badge className="w-full text-center justify-center py-2 bg-red-500">
                      {t.full}
                    </Badge>
                  )}

                  {isParticipant && (
                    <Badge className="w-full text-center justify-center py-2 bg-green-500">
                      ✓ Joined
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Raid;
