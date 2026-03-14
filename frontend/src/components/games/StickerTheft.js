import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Crosshair, Clock, AlertTriangle, Trophy, Target, TrendingDown } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";

const StickerTheft = ({ user, language }) => {
  const [view, setView] = useState("lobby"); // 'lobby', 'select_target', 'result'
  const [userStickers, setUserStickers] = useState([]);
  const [targetUsers, setTargetUsers] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [cooldownInfo, setCooldownInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempting, setAttempting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [gameBalance, setGameBalance] = useState(0);

  // Text translations
  const texts = {
    en: {
      title: "Sticker Theft",
      description: "Attempt to steal stickers from other players",
      cost: "Cost: 0.2 TON",
      cooldown: "Cooldown: 6 hours",
      yourStickers: "Your Stickers",
      selectTarget: "Select Target Player",
      attempt: "Attempt Theft",
      attacking: "Attacking...",
      failed: "Theft Failed!",
      stolen: "You Stole a Sticker!",
      lost: "You Lost a Sticker",
      cooldownActive: "Cooldown Active",
      insufficientBalance: "Low Balance",
      noStickers: "No Stickers",
      back: "Back to Lobby",
      again: "Try Again",
      successRate: "Success Rate",
      outcomes: "70% Nothing • 25% Common • 5% Rare+",
    },
    uk: {
      title: "Вкрадення Стікерів",
      description: "Спробуй вкрасти стікери у інших гравців",
      cost: "Вартість: 0.2 TON",
      cooldown: "Перезагрузка: 6 годин",
      yourStickers: "Твої Стікери",
      selectTarget: "Вибери Ціль",
      attempt: "Спробувати Вкрасти",
      attacking: "Атакуємо...",
      failed: "Вкрадення Провалено!",
      stolen: "Ти Вкрав Стікер!",
      lost: "Ти Втратив Стікер",
      cooldownActive: "Перезагрузка Активна",
      insufficientBalance: "Мало Балансу",
      noStickers: "Немає Стікерів",
      back: "Назад в Лобі",
      again: "Спробувати Знову",
      successRate: "Гарантія Успіху",
      outcomes: "70% Нічого • 25% Звичайний • 5% Рідкісний+",
    },
  };
  
  const t = texts[language] || texts.en;

  useEffect(() => {
    loadGameState();
  }, [user?.id]);

  const loadGameState = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get user stickers
      const stickersRes = await axios.get(`${API}/user/${user.id}/stickers?limit=100`);
      setUserStickers(stickersRes.data || []);

      // Get game balance
      const balRes = await axios.get(`${API}/user/${user.id}/game-balance`).catch(() => ({ data: { balance: 0 } }));
      setGameBalance(balRes.data.balance || 0);

      // Check cooldown
      const cooldownRes = await axios.get(`${API}/game/theft/cooldown-check/${user.id}`);
      setCooldownInfo(cooldownRes.data);

      // Get other users from API
      const usersRes = await axios.get(`${API}/users/list?limit=10`).catch(() => ({ data: [] }));
      const others = (usersRes.data || []).filter(u => u.telegram_id !== user.id).slice(0, 5);
      setTargetUsers(others.map(u => ({ id: u.telegram_id, username: u.username || u.telegram_id, avatar: "👤" })));

    } catch (err) {
      console.error("Error loading game state:", err);
      toast.error("Failed to load game data");
    } finally {
      setLoading(false);
    }
  };

  const handleAttemptTheft = async () => {
    if (!selectedTarget) {
      toast.error("Select a target player");
      return;
    }

    if (gameBalance < 0.2) {
      toast.error("Insufficient balance (need 0.2 TON)");
      return;
    }

    if (!cooldownInfo?.can_attempt) {
      toast.error(`Cooldown active for ${cooldownInfo?.cooldown_remaining} hours`);
      return;
    }

    try {
      setAttempting(true);

      const response = await axios.post(`${API}/game/theft/attempt?attacker_id=${user.id}&target_user_id=${selectedTarget.id}`);

      setLastResult(response.data);
      setView("result");
      setGameBalance(gameBalance - 0.2);

      // Reload stickers
      const stickersRes = await axios.get(`${API}/user/${user.id}/stickers?limit=100`);
      setUserStickers(stickersRes.data || []);

      toast.success(response.data.message);
    } catch (err) {
      console.error("Theft error:", err);
      toast.error(err.response?.data?.detail || "Theft attempt failed");
    } finally {
      setAttempting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">⏳</div>
      </div>
    );
  }

  // LOBBY VIEW
  if (view === "lobby") {
    return (
      <Card className="p-6 max-w-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold mb-2">{t.title}</h2>
          <p className="text-gray-600">{t.description}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-sm text-gray-600">{t.cost}</div>
              <div className="text-xl font-bold">💰 0.2 TON</div>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <div className="text-sm text-gray-600">{t.cooldown}</div>
              <div className="text-xl font-bold">⏱️ 6h</div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-yellow-900">{t.outcomes}</div>
                <div className="text-sm text-yellow-800 mt-1">High risk, high reward!</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-3">{t.yourStickers}</h3>
          <div className="grid grid-cols-4 gap-2">
            {userStickers.slice(0, 8).map((sticker, idx) => (
              <div key={idx} className="text-center">
                <div className="bg-gray-100 rounded p-2 mb-1">
                  <img 
                    src={sticker.image_url} 
                    alt={sticker.sticker_number}
                    className="w-full h-auto object-cover rounded"
                  />
                </div>
                <Badge variant="outline" className="text-xs">
                  {sticker.rarity}
                </Badge>
              </div>
            ))}
          </div>
          {userStickers.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              {t.noStickers}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {cooldownInfo?.can_attempt ? (
            <Button
              onClick={() => setView("select_target")}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Crosshair className="w-4 h-4 mr-2" />
              {t.attempt}
            </Button>
          ) : (
            <Button disabled className="w-full">
              <Clock className="w-4 h-4 mr-2" />
              {t.cooldownActive} ({cooldownInfo?.cooldown_remaining}h)
            </Button>
          )}

          {gameBalance < 0.2 && (
            <div className="text-center text-sm text-orange-600 bg-orange-50 p-3 rounded">
              {t.insufficientBalance}: {gameBalance.toFixed(2)} TON
            </div>
          )}
        </div>
      </Card>
    );
  }

  // SELECT TARGET VIEW
  if (view === "select_target") {
    return (
      <Card className="p-6 max-w-2xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          {t.selectTarget}
        </h2>

        <div className="space-y-2 mb-6">
          {targetUsers.map((player) => (
            <div
              key={player.id}
              onClick={() => setSelectedTarget(player)}
              className={`p-4 rounded cursor-pointer border-2 transition ${
                selectedTarget?.id === player.id
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-2">{player.avatar}</div>
              <div className="font-semibold">{player.username}</div>
              <div className="text-sm text-gray-600">ID: {player.id}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleAttemptTheft}
            disabled={!selectedTarget || attempting || gameBalance < 0.2}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {attempting ? t.attacking : t.attempt}
          </Button>
          <Button
            onClick={() => {
              setView("lobby");
              setSelectedTarget(null);
            }}
            variant="outline"
            className="w-full"
          >
            {t.back}
          </Button>
        </div>
      </Card>
    );
  }

  // RESULT VIEW
  if (view === "result" && lastResult) {
    const isFail = lastResult.outcome === "fail";
    const isSuccess = lastResult.outcome.includes("success");

    return (
      <Card className="p-6 max-w-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">
            {isFail ? "❌" : isSuccess ? "✅" : "🎉"}
          </div>
          <h2 className="text-2xl font-bold">
            {isFail ? t.failed : t.stolen}
          </h2>
        </div>

        <div className="bg-gray-50 p-4 rounded mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">{lastResult.message}</div>
            <div className="text-sm font-semibold text-red-600">
              -{lastResult.cost_deducted} TON
            </div>
          </div>
        </div>

        {isFail && lastResult.lost_sticker && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-3">{t.lost}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <img
                  src={lastResult.lost_sticker.image_url}
                  alt="lost"
                  className="w-full rounded"
                />
              </div>
              <div className="flex flex-col justify-center">
                <Badge className="mb-2">{lastResult.lost_sticker.rarity}</Badge>
                <div className="text-sm text-gray-600">Lost in battle</div>
              </div>
            </div>
          </div>
        )}

        {isSuccess && lastResult.stolen_sticker && (
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-3">🎁 {t.stolen}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <img
                  src={lastResult.stolen_sticker.image_url}
                  alt="stolen"
                  className="w-full rounded"
                />
              </div>
              <div className="flex flex-col justify-center">
                <Badge className="mb-2">{lastResult.stolen_sticker.rarity}</Badge>
                <div className="text-sm text-gray-600">
                  #{lastResult.stolen_sticker.sticker_number}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => {
              setView("lobby");
              setSelectedTarget(null);
              setLastResult(null);
              loadGameState();
            }}
            className="w-full"
          >
            {t.again}
          </Button>
          <Button
            onClick={() => {
              setView("lobby");
              setSelectedTarget(null);
              setLastResult(null);
            }}
            variant="outline"
            className="w-full"
          >
            {t.back}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
};

export default StickerTheft;
