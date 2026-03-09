import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Swords, Trophy, Target, RotateCcw, Zap } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";

const StickerBattle = ({ user, language }) => {
  const [view, setView] = useState("lobby"); // 'lobby', 'create', 'join', 'battle', 'history'
  const [userStickers, setUserStickers] = useState([]);
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [battling, setBattling] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  // Load user stickers
  const loadUserStickers = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get(`${API}/user/${user.id}/stickers?limit=100`);
      setUserStickers(response.data.stickers || []);
    } catch (err) {
      console.error("Error loading stickers:", err);
      setError(err.response?.data?.detail || "Failed to load stickers");
    }
  };

  // Load available rooms
  const loadAvailableRooms = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get(`${API}/game/battle/rooms?user_id=${user.id}`);
      setAvailableRooms(response.data.rooms || []);
    } catch (err) {
      console.error("Error loading rooms:", err);
    }
  };

  // Create battle room
  const createRoom = async () => {
    if (!user?.id || !selectedSticker) {
      toast.error("Select a sticker first");
      return;
    }

    try {
      setBattling(true);
      const response = await axios.post(`${API}/game/battle/create-room?user_id=${user.id}&sticker_id=${selectedSticker.id}`);
      
      toast.success("Room created! Waiting for opponent...");
      setCurrentRoom(response.data);
      setView("battle");
      setSelectedSticker(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create room");
    } finally {
      setBattling(false);
    }
  };

  // Join room
  const joinRoom = async (roomId) => {
    if (!user?.id || !selectedSticker) {
      toast.error("Select a sticker first");
      return;
    }

    try {
      setBattling(true);
      const response = await axios.post(
        `${API}/game/battle/join-room?user_id=${user.id}&room_id=${roomId}&sticker_id=${selectedSticker.id}`
      );
      
      toast.success("Joined battle! Ready to fight!");
      setCurrentRoom(response.data);
      setView("battle");
      setSelectedSticker(null);
      loadAvailableRooms();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to join room");
    } finally {
      setBattling(false);
    }
  };

  // Get room status
  const checkRoomStatus = async (roomId) => {
    try {
      const response = await axios.get(`${API}/game/battle/room/${roomId}`);
      setCurrentRoom(response.data);
    } catch (err) {
      console.error("Error checking room status:", err);
    }
  };

  // Resolve battle
  const resolveBattle = async (winnerId) => {
    if (!currentRoom?.room_id) return;

    try {
      setBattling(true);
      const response = await axios.post(
        `${API}/game/battle/resolve?user_id=${user.id}&room_id=${currentRoom.room_id}&winner_id=${winnerId}`
      );
      
      toast.success(response.data.message);
      setCurrentRoom(null);
      setView("history");
      loadBattleHistory();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resolve battle");
    } finally {
      setBattling(false);
    }
  };

  // Load battle history
  const loadBattleHistory = async () => {
    if (!user?.id) return;

    try {
      const response = await axios.get(`${API}/game/battle/history/${user.id}?limit=10`);
      setHistory(response.data.battles || []);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  // Initialize
  useEffect(() => {
    loadUserStickers();
    loadAvailableRooms();
    loadBattleHistory();
    setLoading(false);
  }, [user?.id]);

  // Poll room status if in battle
  useEffect(() => {
    if (view === "battle" && currentRoom?.room_id) {
      const interval = setInterval(() => {
        checkRoomStatus(currentRoom.room_id);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [view, currentRoom?.room_id]);

  const getRarityColor = (rarity) => {
    const colors = {
      common: "bg-gray-500",
      uncommon: "bg-green-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-yellow-500"
    };
    return colors[rarity?.toLowerCase()] || "bg-gray-500";
  };

  const getRarityBadgeColor = (rarity) => {
    const colors = {
      common: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      uncommon: "bg-green-500/20 text-green-300 border-green-500/30",
      rare: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      epic: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      legendary: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    };
    return colors[rarity?.toLowerCase()] || "bg-gray-500/20 text-gray-300";
  };

  // LOBBY VIEW
  if (view === "lobby") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="text-red-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {language === "ru" ? "Бой стикеров" : "Sticker Battle"}
          </h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">⚠️ {error}</p>
          </div>
        )}

        <Card className="bg-blue-500/10 border-blue-500/30 p-4">
          <p className="text-sm text-blue-300">
            ⚔️ {language === "ru" ? "Выбери стикер, создай или присоединись к бою!" : "Choose a sticker, create or join a battle!"}
          </p>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-3"></div>
              <p className="text-gray-400">{language === "ru" ? "Загружаем..." : "Loading..."}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Select Sticker */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                {language === "ru" ? "Выбери стикер" : "Select Your Sticker"}
              </h2>

              {userStickers.length === 0 ? (
                <Card className="bg-orange-500/10 border-orange-500/30 p-4">
                  <p className="text-orange-300 text-sm">
                    {language === "ru" ? "Нет стикеров для боя" : "No stickers available"}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto mb-4">
                  {userStickers.slice(0, 12).map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => setSelectedSticker(sticker)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        selectedSticker?.id === sticker.id
                          ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/30"
                          : "border-cyan-500/30 bg-[#1a1a2e]/50 hover:border-cyan-400/60"
                      }`}
                    >
                      <p className="text-xs font-bold text-white truncate mb-1">
                        {sticker.pack_name}
                      </p>
                      <Badge className={`${getRarityBadgeColor(sticker.rarity)} text-xs w-full justify-center`}>
                        {sticker.rarity}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {selectedSticker && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Button
                    onClick={() => {
                      setView("create");
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2"
                  >
                    🎯 {language === "ru" ? "Создать" : "Create"}
                  </Button>
                  <Button
                    onClick={() => {
                      setView("join");
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2"
                  >
                    🔗 {language === "ru" ? "Присоединиться" : "Join"}
                  </Button>
                </div>
              )}
            </div>

            {/* Available Rooms */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                {language === "ru" ? "Доступные комнаты" : "Available Rooms"} ({availableRooms.length})
              </h2>

              {availableRooms.length === 0 ? (
                <Card className="bg-orange-500/10 border-orange-500/30 p-4">
                  <p className="text-orange-300 text-sm text-center">
                    {language === "ru" ? "Нет доступных комнат" : "No available rooms"}
                  </p>
                </Card>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableRooms.slice(0, 5).map((room) => (
                    <Card
                      key={room.room_id}
                      className="bg-cyan-500/10 border-cyan-500/30 p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getRarityBadgeColor(room.sticker_rarity)}>
                          {room.sticker_rarity}
                        </Badge>
                        <span className="text-sm text-gray-300">
                          {room.creator_user_id} • {room.sticker_value} TON
                        </span>
                      </div>
                      <Button
                        onClick={() => {
                          if (!selectedSticker) {
                            toast.error(language === "ru" ? "Выбери стикер" : "Select a sticker first");
                            return;
                          }
                          joinRoom(room.room_id);
                        }}
                        disabled={!selectedSticker || battling}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs py-1 px-3"
                      >
                        Join
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* History Button */}
            <Button
              onClick={() => setView("history")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2"
            >
              📊 {language === "ru" ? "История" : "History"}
            </Button>
          </>
        )}
      </div>
    );
  }

  // CREATE ROOM VIEW
  if (view === "create" && selectedSticker) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="text-red-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {language === "ru" ? "Создать комнату" : "Create Room"}
          </h1>
        </div>

        <Card className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#2a1a3e]/80 border-cyan-500/20 p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            {language === "ru" ? "Ваш стикер" : "Your Sticker"}
          </h2>

          <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-lg p-4 text-center mb-4">
            <p className="text-sm text-gray-400 mb-2">{selectedSticker.pack_name}</p>
            <Badge className={getRarityBadgeColor(selectedSticker.rarity)}>
              {selectedSticker.rarity}
            </Badge>
          </div>

          <Button
            onClick={createRoom}
            disabled={battling}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
          >
            {battling ? "Creating..." : "🎯 " + (language === "ru" ? "Создать комнату" : "Create Room")}
          </Button>
        </Card>

        <Button
          onClick={() => setView("lobby")}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2"
        >
          ← {language === "ru" ? "Назад" : "Back"}
        </Button>
      </div>
    );
  }

  // JOIN ROOM VIEW
  if (view === "join" && selectedSticker) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Swords className="text-red-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {language === "ru" ? "Присоединиться" : "Join Battle"}
          </h1>
        </div>

        <Card className="bg-blue-500/10 border-blue-500/30 p-4">
          <p className="text-sm text-blue-300 text-center">
            {language === "ru" ? "Ваш стикер выбран" : "Your sticker selected"}
          </p>
        </Card>

        <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-lg p-4 text-center mb-4">
          <p className="text-sm text-gray-400 mb-2">{selectedSticker.pack_name}</p>
          <Badge className={getRarityBadgeColor(selectedSticker.rarity)}>
            {selectedSticker.rarity}
          </Badge>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white mb-3">
            {language === "ru" ? "Доступные комнаты" : "Available Rooms"}
          </h2>
          {availableRooms.length === 0 ? (
            <Card className="bg-orange-500/10 border-orange-500/30 p-4">
              <p className="text-orange-300 text-sm text-center">
                {language === "ru" ? "Нет доступных комнат" : "No available rooms"}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {availableRooms.map((room) => (
                <Card
                  key={room.room_id}
                  className="bg-cyan-500/10 border-cyan-500/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getRarityBadgeColor(room.sticker_rarity)}>
                        {room.sticker_rarity}
                      </Badge>
                      <span className="text-sm text-gray-300">
                        {room.creator_user_id} • {room.sticker_value} TON
                      </span>
                    </div>
                    <Button
                      onClick={() => joinRoom(room.room_id)}
                      disabled={battling}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs py-1 px-3"
                    >
                      {battling ? "..." : "Join"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={() => setView("lobby")}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2"
        >
          ← {language === "ru" ? "Назад" : "Back"}
        </Button>
      </div>
    );
  }

  // BATTLE VIEW
  if (view === "battle" && currentRoom) {
    const isReady = currentRoom.status === "ready";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="text-yellow-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {isReady ? (language === "ru" ? "Результат боя" : "Battle Result") : (language === "ru" ? "Ждём..." : "Waiting...")}
          </h1>
        </div>

        <Card className="bg-gradient-to-r from-[#1a1a2e]/80 to-[#2a1a3e]/80 border-cyan-500/20 p-6">
          {/* Battle Arena */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Player 1 */}
            <div className="text-center">
              <div className="bg-cyan-500/20 border-2 border-cyan-500/50 rounded-lg p-3 mb-3">
                <div className="text-2xl mb-2">👤</div>
                <p className="text-xs text-white font-bold mb-1">YOU</p>
                <Badge className={getRarityBadgeColor(currentRoom.creator_sticker_rarity)}>
                  {currentRoom.creator_sticker_rarity}
                </Badge>
                <p className="text-xs text-gray-400 mt-1">{currentRoom.creator_sticker_value} TON</p>
              </div>
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-black text-red-500 mb-2">VS</p>
                <p className="text-xs text-yellow-400">⚔️</p>
              </div>
            </div>

            {/* Player 2 / Opponent */}
            <div className="text-center">
              {isReady && currentRoom.opponent_sticker_rarity ? (
                <div className="bg-purple-500/20 border-2 border-purple-500/50 rounded-lg p-3 mb-3">
                  <div className="text-2xl mb-2">🎖️</div>
                  <p className="text-xs text-white font-bold mb-1">OPP</p>
                  <Badge className={getRarityBadgeColor(currentRoom.opponent_sticker_rarity)}>
                    {currentRoom.opponent_sticker_rarity}
                  </Badge>
                  <p className="text-xs text-gray-400 mt-1">{currentRoom.opponent_sticker_value} TON</p>
                </div>
              ) : (
                <div className="bg-gray-500/20 border-2 border-gray-500/30 rounded-lg p-3 mb-3 opacity-50">
                  <div className="text-2xl mb-2">❓</div>
                  <p className="text-xs text-gray-400">{language === "ru" ? "Ждём..." : "Waiting..."}</p>
                </div>
              )}
            </div>
          </div>

          {/* Battle Info */}
          {isReady && (
            <div className="grid grid-cols-3 gap-3 mb-6 text-center text-xs">
              <div className="bg-black/30 rounded p-2">
                <p className="text-gray-400 mb-1">{language === "ru" ? "Банк" : "Pot"}</p>
                <p className="text-lg font-bold text-yellow-400">{currentRoom.pot_value} TON</p>
              </div>
              <div className="bg-black/30 rounded p-2">
                <p className="text-gray-400 mb-1">{language === "ru" ? "Комиссия" : "Fee"}</p>
                <p className="text-lg font-bold text-red-400">{currentRoom.fee_per_player} TON</p>
              </div>
              <div className="bg-black/30 rounded p-2">
                <p className="text-gray-400 mb-1">Status</p>
                <p className="text-lg font-bold text-green-400">READY!</p>
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        {isReady ? (
          <div className="space-y-3">
            <p className="text-sm text-center text-gray-400">
              {language === "ru" ? "Выберите победителя" : "Choose the winner"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => resolveBattle(user.id)}
                disabled={battling}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3"
              >
                {battling ? "..." : "🎉 " + (language === "ru" ? "Я выиграл" : "I Won")}
              </Button>
              <Button
                onClick={() => resolveBattle(currentRoom.opponent_user_id)}
                disabled={battling}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3"
              >
                {battling ? "..." : "💪 " + (language === "ru" ? "Я проиграл" : "I Lost")}
              </Button>
            </div>
          </div>
        ) : (
          <Card className="bg-blue-500/10 border-blue-500/30 p-4 text-center">
            <p className="text-sm text-blue-300">
              {language === "ru" ? "Ждём присоединения противника..." : "Waiting for opponent to join..."}
            </p>
          </Card>
        )}

        <Button
          onClick={() => setView("lobby")}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2"
        >
          ← {language === "ru" ? "Лобби" : "Lobby"}
        </Button>
      </div>
    );
  }

  // HISTORY VIEW
  if (view === "history") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="text-purple-400" size={24} />
          <h1 className="text-2xl font-bold text-white">
            {language === "ru" ? "История боев" : "Battle History"}
          </h1>
        </div>

        {history.length === 0 ? (
          <Card className="bg-orange-500/10 border-orange-500/30 p-4">
            <p className="text-orange-300 text-sm text-center">
              {language === "ru" ? "Нет боев" : "No battles yet"}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((battle, idx) => (
              <Card
                key={idx}
                className={`border-2 p-3 ${
                  battle.won
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-orange-500/10 border-orange-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={battle.won ? "text-green-400 text-lg" : "text-orange-400 text-lg"}>
                      {battle.won ? "✅" : "❌"}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {language === "ru" ? "Боевая арена" : "Battle Arena"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {language === "ru" ? "Банк" : "Pot"}: {battle.pot_value} TON
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">+{battle.reward}</p>
                    <p className="text-xs text-gray-400">TON</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button
          onClick={() => setView("lobby")}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2"
        >
          ⚔️ {language === "ru" ? "Назад в лобби" : "Back to Lobby"}
        </Button>
      </div>
    );
  }
};

export default StickerBattle;
