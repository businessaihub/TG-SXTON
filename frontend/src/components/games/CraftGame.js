import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Wand2, RotateCcw, Zap, TrendingUp } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const CraftGame = ({ user, language }) => {
  const [availableStickers, setAvailableStickers] = useState({
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    legendary: []
  });
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState([]);
  const [craftResult, setCraftResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("select"); // 'select', 'result', 'history'

  const craftCosts = {
    common: 10,
    uncommon: 25,
    rare: 50,
    epic: 100
  };

  const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];

  // Load available stickers
  const loadAvailableStickers = async () => {
    if (!user || !user.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API}/game/craft/available?user_id=${user.id}`);
      setAvailableStickers(response.data);
    } catch (err) {
      console.error("Error loading stickers:", err);
      setError(err.response?.data?.detail || "Failed to load stickers");
    } finally {
      setLoading(false);
    }
  };

  // Craft stickers
  const craftStickers = async () => {
    if (!user || !user.id || selectedStickers.length < 2) {
      setError(language === "ru" ? "Выберите минимум 2 стикера" : "Select at least 2 stickers");
      return;
    }

    try {
      setCrafting(true);
      setError(null);

      const response = await axios.post(`${API}/game/craft/combine`, null, {
        params: {
          user_id: user.id,
          sticker_ids: selectedStickers
        }
      });

      setCraftResult(response.data);
      setSelectedStickers([]);
      setCurrentView("result");
      
      // Load updated history
      loadCraftHistory();
      
      // Reload available stickers
      setTimeout(() => loadAvailableStickers(), 500);
    } catch (err) {
      console.error("Error crafting:", err);
      setError(err.response?.data?.detail || "Failed to craft stickers");
    } finally {
      setCrafting(false);
    }
  };

  // Load craft history
  const loadCraftHistory = async () => {
    if (!user || !user.id) return;

    try {
      const response = await axios.get(`${API}/user/${user.id}/game/craft/history?limit=10`);
      setHistory(response.data.crafts);
      setStats(response.data.stats);
    } catch (err) {
      console.error("Error loading craft history:", err);
    }
  };

  // Initialize
  useEffect(() => {
    loadAvailableStickers();
    loadCraftHistory();
  }, [user?.id]);

  const toggleStickerSelect = (stickerId) => {
    setSelectedStickers(prev => {
      if (prev.includes(stickerId)) {
        return prev.filter(id => id !== stickerId);
      } else {
        return [...prev, stickerId];
      }
    });
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: "bg-gray-600",
      uncommon: "bg-green-600",
      rare: "bg-blue-600",
      epic: "bg-purple-600",
      legendary: "bg-yellow-600"
    };
    return colors[rarity?.toLowerCase()] || "bg-gray-600";
  };

  const getRarityBorder = (rarity) => {
    const colors = {
      common: "border-gray-500",
      uncommon: "border-green-500",
      rare: "border-blue-500",
      epic: "border-purple-500",
      legendary: "border-yellow-500"
    };
    return colors[rarity?.toLowerCase()] || "border-gray-500";
  };

  const getNextRarity = (rarity) => {
    const idx = rarityOrder.indexOf(rarity.toLowerCase());
    if (idx < rarityOrder.length - 1) {
      return rarityOrder[idx + 1];
    }
    return rarity;
  };

  // SELECT STICKERS VIEW
  if (currentView === "select") {
    const selectedRarity = selectedStickers.length > 0 
      ? availableStickers[Object.keys(availableStickers).find(r => 
          availableStickers[r].find(s => s.id === selectedStickers[0])
        )]?.[0]?.rarity 
      : null;

    const craftCost = selectedRarity ? craftCosts[selectedRarity] : 0;
    const nextRarity = selectedRarity ? getNextRarity(selectedRarity) : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="text-green-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {language === "ru" ? "Крафт стикеров" : "Craft Stickers"}
          </h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">⚠️ {error}</p>
          </div>
        )}

        <Card className="bg-blue-500/10 border-blue-500/30 p-4">
          <p className="text-sm text-blue-300">
            {language === "ru"
              ? "✨ Комбинируй 2-3 стикера одной редкости в 1 более редкий стикер"
              : "✨ Combine 2-3 stickers of same rarity into 1 rarer sticker"}
          </p>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-3"></div>
              <p className="text-gray-400">
                {language === "ru" ? "Загружаем стикеры..." : "Loading stickers..."}
              </p>
            </div>
          </div>
        ) : Object.values(availableStickers).flat().length === 0 ? (
          <Card className="bg-orange-500/10 border-orange-500/30 p-4">
            <p className="text-orange-300 text-sm">
              {language === "ru" ? "У вас нет стикеров для крафта" : "You have no stickers for crafting"}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {rarityOrder.map((rarity) => {
              const stickers = availableStickers[rarity] || [];
              if (stickers.length === 0) return null;

              return (
                <div key={rarity}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-white capitalize">
                      {language === "ru" ? rarity === "common" ? "Обычные" : rarity === "uncommon" ? "Необычные" : rarity === "rare" ? "Редкие" : rarity === "epic" ? "Эпические" : "Легендарные" : rarity}
                    </h2>
                    <Badge className={`${getRarityColor(rarity)} text-white`}>
                      {stickers.length}x
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto mb-4">
                    {stickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => toggleStickerSelect(sticker.id)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedStickers.includes(sticker.id)
                            ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/30 scale-105"
                            : `border-${getRarityBorder(sticker.rarity)} bg-[#1a1a2e]/50 hover:border-cyan-400/60 hover:bg-[#2a1a3e]/50`
                        }`}
                      >
                        <div className="text-center">
                          <p className="text-xs font-bold text-white truncate mb-2">
                            {sticker.pack_name}
                          </p>
                          {selectedStickers.includes(sticker.id) && (
                            <div className="text-cyan-400 text-lg mb-1">✓</div>
                          )}
                          <Badge className={`${getRarityColor(sticker.rarity)} text-white text-xs justify-center w-full`}>
                            {sticker.rarity}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Craft Preview */}
            {selectedStickers.length >= 2 && (
              <Card className="bg-gradient-to-r from-[#1a1a2e]/80 to-[#2a1a3e]/80 border-cyan-500/20 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">
                        {language === "ru" ? "Входные стикеры" : "Input Stickers"}
                      </p>
                      <p className="text-xl font-bold text-white">
                        {selectedStickers.length}x {selectedRarity && selectedRarity.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-3xl">→</div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">
                        {language === "ru" ? "Выходной стикер" : "Output Sticker"}
                      </p>
                      <p className={`text-xl font-bold ${getRarityColor(nextRarity)} px-3 py-1 rounded text-white`}>
                        1x {nextRarity && nextRarity.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-cyan-500/20 pt-3">
                    <p className="text-yellow-400 font-bold text-center">
                      {language === "ru" ? `Стоимость: -${craftCost} SXTON` : `Cost: -${craftCost} SXTON`}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Craft Button */}
            <Button
              onClick={craftStickers}
              disabled={selectedStickers.length < 2 || crafting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all"
            >
              {crafting ? (
                <div className="flex items-center gap-2 justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  {language === "ru" ? "Крафтим..." : "Crafting..."}
                </div>
              ) : (
                "✨ " + (language === "ru" ? "Крафтить" : "Craft")
              )}
            </Button>
          </div>
        )}

        {stats && stats.total_crafts > 0 && (
          <div>
            <h3 className="text-sm font-bold text-white mb-2">
              {language === "ru" ? "Статистика" : "Stats"}
            </h3>
            <Card className="bg-[#1a1a2e]/50 border-cyan-500/20 p-3">
              <div className="text-center">
                <p className="text-gray-400 text-xs">{language === "ru" ? "SXTON затрачено" : "SXTON Spent"}</p>
                <p className="text-2xl font-bold text-yellow-400">-{stats.total_sxton_spent}</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // CRAFT RESULT VIEW
  if (currentView === "result" && craftResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="text-green-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {language === "ru" ? "Результат крафта" : "Craft Result"}
          </h1>
        </div>

        {/* Success Animation */}
        <Card className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 border-green-500/30 p-6 text-center">
          <div className="text-6xl mb-4 animate-bounce">✨</div>
          <p className="text-2xl font-bold text-green-400 mb-2">
            {language === "ru" ? "Успех!" : "Success!"}
          </p>
          <p className="text-gray-300 text-sm">
            {craftResult.message}
          </p>
        </Card>

        {/* Craft Details */}
        <Card className="bg-gradient-to-r from-[#1a1a2e]/80 to-[#2a1a3e]/80 border-cyan-500/20 p-6">
          <div className="grid grid-cols-3 gap-4 items-center mb-6">
            {/* Input */}
            <div className="text-center">
              <div className={`border-4 ${getRarityColor(craftResult.input_rarity)} rounded-lg p-3 mb-3`}>
                <p className="text-3xl mb-2">📦</p>
              </div>
              <p className="text-xs text-gray-400 mb-1">
                {language === "ru" ? "Входные" : "Input"}
              </p>
              <p className="text-sm font-bold text-white">
                2x {craftResult.input_rarity.toUpperCase()}
              </p>
            </div>

            {/* Arrow */}
            <div className="text-center">
              <p className="text-3xl text-green-400">→</p>
            </div>

            {/* Output */}
            <div className="text-center">
              <div className={`border-4 ${getRarityColor(craftResult.output_rarity)} rounded-lg p-3 mb-3`}>
                <p className="text-3xl mb-2">⭐</p>
              </div>
              <p className="text-xs text-gray-400 mb-1">
                {language === "ru" ? "Выход" : "Output"}
              </p>
              <p className="text-sm font-bold text-white">
                1x {craftResult.output_rarity.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Cost */}
          <div className="border-t border-cyan-500/20 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400">
                {language === "ru" ? "Стоимость крафта" : "Craft Cost"}
              </p>
              <p className="text-xl font-bold text-yellow-400">
                -{craftResult.cost_paid} SXTON
              </p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => {
              setCurrentView("select");
              setCraftResult(null);
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-all"
          >
            ✨ {language === "ru" ? "Еще крафт" : "Craft More"}
          </Button>
          <Button
            onClick={() => setCurrentView("history")}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition-all"
          >
            📊 {language === "ru" ? "История" : "History"}
          </Button>
        </div>

        {/* Updated Stats */}
        {stats && (
          <div>
            <h3 className="text-sm font-bold text-white mb-2">
              {language === "ru" ? "Статистика" : "Stats"}
            </h3>
            <Card className="bg-[#1a1a2e]/50 border-cyan-500/20 p-3">
              <div className="text-center">
                <p className="text-gray-400 text-xs">{language === "ru" ? "Всего потрачено" : "Total Spent"}</p>
                <p className="text-2xl font-bold text-yellow-400">-{stats.total_sxton_spent}</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // HISTORY VIEW
  if (currentView === "history") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-purple-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {language === "ru" ? "История крафтов" : "Craft History"}
          </h1>
        </div>

        {/* Stats Card */}
        {stats && (
          <Card className="bg-[#1a1a2e]/50 border-cyan-500/20 p-4">
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-1">
                {language === "ru" ? "Всего крафтов" : "Total Crafts"}
              </p>
              <p className="text-3xl font-bold text-cyan-400 mb-3">
                {stats.total_crafts}
              </p>
              <p className="text-gray-400 text-xs mb-1">
                {language === "ru" ? "SXTON потрачено" : "SXTON Spent"}
              </p>
              <p className="text-2xl font-bold text-yellow-400">
                -{stats.total_sxton_spent}
              </p>
            </div>
          </Card>
        )}

        {/* Craft List */}
        <div>
          <h3 className="text-lg font-bold text-white mb-3">
            {language === "ru" ? "Последние крафты" : "Recent Crafts"}
          </h3>
          
          {history.length === 0 ? (
            <Card className="bg-orange-500/10 border-orange-500/30 p-4">
              <p className="text-orange-300 text-sm text-center">
                {language === "ru" ? "Нет крафтов" : "No crafts yet"}
              </p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((craft) => (
                <Card
                  key={craft.id}
                  className="bg-[#1a1a2e]/50 border-cyan-500/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`${getRarityColor(craft.input_rarity)} rounded px-2 py-1`}>
                        <p className="text-white font-bold text-sm">
                          {craft.input_count}x {craft.input_rarity}
                        </p>
                      </div>
                      <p className="text-cyan-400">→</p>
                      <div className={`${getRarityColor(craft.output_rarity)} rounded px-2 py-1`}>
                        <p className="text-white font-bold text-sm">
                          1x {craft.output_rarity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-400 font-bold text-sm">-{craft.cost}</p>
                      <p className="text-gray-400 text-xs">SXTON</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <Button
          onClick={() => {
            setCurrentView("select");
            setCraftResult(null);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-all"
        >
          ✨ {language === "ru" ? "Вернуться к крафту" : "Back to Craft"}
        </Button>
      </div>
    );
  }
};

export default CraftGame;
