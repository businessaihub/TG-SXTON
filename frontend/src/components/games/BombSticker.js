import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { AlertTriangle, Send, Clock, Bomb } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";

const BombSticker = ({ user, language }) => {
  const [bombStatus, setBombStatus] = useState(null);
  const [otherUsers, setOtherUsers] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passing, setPassing] = useState(false);

  const texts = {
    en: {
      title: "💣 Bomb Sticker",
      description: "Hot potato! Pass it before it explodes",
      noBomb: "No active bomb",
      hasBomb: "You have a bomb!",
      timeRemaining: "Time remaining",
      pass: "Pass to Player",
      selectTarget: "Select target player",
      passing: "Passing...",
      passed: "Passed successfully!",
      exploded: "💥 Bomb exploded! Lost a sticker",
      warning: "Pass the bomb within 24 hours or lose a sticker!",
    },
    uk: {
      title: "💣 Бомба Стікер",
      description: "Картофель! Передай перш ніж вибухне",
      noBomb: "Немає активної бомби",
      hasBomb: "У тебе є бомба!",
      timeRemaining: "Часу залишилось",
      pass: "Передати Гравцю",
      selectTarget: "Вибери цільового гравця",
      passing: "Передаємо...",
      passed: "Успішно передано!",
      exploded: "💥 Бомба вибухла! Втратив стікер",
      warning: "Передай бомбу протягом 24 годин або втратиш стікер!",
    },
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    loadBombStatus();
  }, [user?.id]);

  const loadBombStatus = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API}/game/bomb/status/${user.id}`);
      setBombStatus(res.data);

      // Load real users from API
      const usersRes = await axios.get(`${API}/users/list?limit=10`).catch(() => ({ data: [] }));
      const others = (usersRes.data || []).filter(u => u.telegram_id !== user.id).slice(0, 5);
      setOtherUsers(others.map(u => ({ id: u.telegram_id, username: u.username || u.telegram_id })));
    } catch (err) {
      console.error("Error loading bomb status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePass = async () => {
    if (!selectedTarget) {
      toast.error("Select a target");
      return;
    }

    try {
      setPassing(true);
      const res = await axios.post(`${API}/game/bomb/pass?from_user=${user.id}&to_user=${selectedTarget.id}`);

      toast.success(res.data.message);
      setSelectedTarget(null);
      await loadBombStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to pass bomb");
    } finally {
      setPassing(false);
    }
  };

  if (loading) {
    return <div className="animate-spin">⏳</div>;
  }

  return (
    <Card className="p-6 max-w-2xl">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">💣</div>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-gray-600">{t.description}</p>
      </div>

      {!bombStatus?.has_bomb ? (
        <div className="bg-gray-50 p-6 rounded text-center border border-gray-200">
          <div className="text-4xl mb-3">😌</div>
          <p className="text-gray-600">{t.noBomb}</p>
          <p className="text-sm text-gray-500 mt-2">Safe for now...</p>
        </div>
      ) : (
        <>
          <div className="bg-red-50 border-2 border-red-400 rounded p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-bold text-red-900">{t.hasBomb}</h3>
                <p className="text-sm text-red-700">{t.warning}</p>
              </div>
            </div>

            <div className="bg-white rounded p-3 mt-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-sm text-gray-600">{t.timeRemaining}</div>
                  <div className="text-xl font-bold text-red-600">
                    {bombStatus.time_remaining_hours}h
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">{t.selectTarget}</h3>
            <div className="space-y-2">
              {otherUsers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => setSelectedTarget(player)}
                  className={`p-3 rounded cursor-pointer border-2 transition ${
                    selectedTarget?.id === player.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold">👤 {player.username}</div>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handlePass}
            disabled={!selectedTarget || passing}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {passing ? t.passing : t.pass}
          </Button>
        </>
      )}
    </Card>
  );
};

export default BombSticker;
