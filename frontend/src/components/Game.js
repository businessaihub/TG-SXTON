import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Zap, Trophy, Clock, TrendingUp, Plus, Sparkles, ChevronLeft } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import GuessingGame from "./games/GuessingGame";
import StickerBattle from "./games/StickerBattle";
import CraftGame from "./games/CraftGame";
import DailySpinWheel from "./games/DailySpinWheel";
import StickerTheft from "./games/StickerTheft";
import BombSticker from "./games/BombSticker";
import Raid from "./games/Raid";
import PuzzleDrop from "./games/PuzzleDrop";

const Game = ({ user, language }) => {
  const [holdStatus, setHoldStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingTestData, setCreatingTestData] = useState(false);
  const [activeGame, setActiveGame] = useState(null); // 'price', 'spin', 'battle', 'craft', 'theft', 'bomb', 'raid', 'puzzle'

  const createTestStickers = async () => {
    if (!user || !user.id) return;
    
    try {
      setCreatingTestData(true);
      setError(null);
      console.log("Creating test stickers for user:", user.id);
      const response = await axios.post(`${API}/test/create-stickers?user_id=${user.id}`);
      console.log("Test stickers created:", response.data);
      
      // Wait a moment then refresh hold status
      setTimeout(async () => {
        try {
          const holdResponse = await axios.get(`${API}/user/${user.id}/packs/hold-status`);
          console.log("Updated hold status:", holdResponse.data);
          setHoldStatus(holdResponse.data);
        } catch (refreshErr) {
          console.error("Error refreshing hold status:", refreshErr);
        }
      }, 500);
    } catch (err) {
      console.error("Error creating test stickers:", err);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to create test stickers";
      setError(errorMsg);
    } finally {
      setCreatingTestData(false);
    }
  };

  useEffect(() => {
    const fetchHoldStatus = async () => {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API}/user/${user.id}/packs/hold-status`);
        console.log("Hold status response:", response.data);
        setHoldStatus(response.data);
      } catch (err) {
        console.error("Error fetching hold status:", err);
        const errorMsg = err.response?.data?.detail || err.message || "Failed to load hold status";
        setError(errorMsg);
        setHoldStatus({
          hold_threshold: 30,
          resale_multiplier: 1.05,
          summary: { total_active_holders: 0, verified_count: 0 },
          packs: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHoldStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchHoldStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Please log in to view game content</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-yellow-400" size={24} />
          <h2 className="text-xl font-bold text-white">Hold Boost</h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm mb-2">⚠️ {error}</p>
            <p className="text-xs text-red-300">API: {API}/user/{user.id}/packs/hold-status</p>
          </div>
        )}

        {loading && !holdStatus ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Loading hold status...</p>
            </div>
          </div>
        ) : !holdStatus || !holdStatus.packs || holdStatus.packs.length === 0 ? (
          <div className="space-y-3">
            <Card className="bg-[#1a1a2e]/80 border-cyan-500/20 p-6 text-center">
              <Zap size={48} className="mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400 mb-2">
                {language === 'ru' 
                  ? 'Нет стикеров в холде' 
                  : 'No stickers in hold'}
              </p>
              <p className="text-gray-500 text-sm">
                {language === 'ru'
                  ? 'Купите стикеры, чтобы начать получать бонус'
                  : 'Buy stickers to start earning boost'}
              </p>
            </Card>
            
            <Button
              onClick={createTestStickers}
              disabled={creatingTestData}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Plus size={16} className="mr-2" />
              {creatingTestData
                ? language === 'ru' ? 'Создание...' : 'Creating...'
                : language === 'ru' ? 'Создать тестовые стикеры' : 'Create Test Stickers'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            {holdStatus.summary && (
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-[#1a1a2e]/80 border-cyan-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={18} className="text-yellow-400" />
                    <span className="text-sm text-gray-400">
                      {language === 'ru' ? 'Активные' : 'Active'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-400">
                    {holdStatus.summary.total_active_holders || 0}
                  </p>
                </Card>

                <Card className="bg-[#1a1a2e]/80 border-cyan-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={18} className="text-green-400" />
                    <span className="text-sm text-gray-400">
                      {language === 'ru' ? 'Усиление' : 'Boost'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    {holdStatus.summary.verified_count || 0}
                  </p>
                </Card>
              </div>
            )}

            {/* Packs Hold Progress */}
            <div className="space-y-3">
              {holdStatus.packs.map((pack) => {
                const progress = Math.min((pack.days_held / pack.threshold_days) * 100, 100);
                const isVerified = pack.verified_holder;

                return (
                  <Card
                    key={pack.sticker_id}
                    className="bg-gradient-to-r from-[#1a1a2e]/80 to-[#2a1a3e]/80 border-cyan-500/20 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{pack.pack_name}</h3>
                        <p className="text-sm text-gray-400">#{pack.sticker_serial}</p>
                      </div>
                      {isVerified && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {language === 'ru' ? 'Проверено' : 'Verified'}
                        </Badge>
                      )}
                    </div>

                    {!isVerified && (
                      <>
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-cyan-400" />
                              <span className="text-xs text-gray-400">
                                {language === 'ru'
                                  ? `${pack.days_held} из ${pack.threshold_days} дней`
                                  : `${pack.days_held} of ${pack.threshold_days} days`}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-cyan-400">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <p className="text-xs text-gray-400">
                          {language === 'ru'
                            ? `Осталось ${Math.max(0, pack.threshold_days - pack.days_held)} дней`
                            : `${Math.max(0, pack.threshold_days - pack.days_held)} days remaining`}
                        </p>
                      </>
                    )}

                    {isVerified && (
                      <div className="flex items-center gap-2 text-green-400">
                        <Zap size={14} />
                        <span className="text-sm font-semibold">
                          {language === 'ru'
                            ? `Усиление ${Math.round((pack.multiplier - 1) * 100)}% при перепродаже`
                            : `${Math.round((pack.multiplier - 1) * 100)}% boost on resale`}
                        </span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Info Box */}
            <Card className="bg-blue-500/10 border-blue-500/30 p-4">
              <p className="text-sm text-blue-300">
                {language === 'ru'
                  ? '💡 Держите стикеры 30 дней или больше, чтобы получить усиление при перепродаже'
                  : '💡 Hold stickers for 30+ days to get a boost when reselling'}
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Game Hub - Show active game or Game Hub grid */}
      {activeGame === 'price' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <GuessingGame user={user} language={language} />
        </div>
      ) : activeGame === 'battle' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <StickerBattle user={user} language={language} />
        </div>
      ) : activeGame === 'craft' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <CraftGame user={user} language={language} />
        </div>
      ) : activeGame === 'spin' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <DailySpinWheel user={user} language={language} />
        </div>
      ) : activeGame === 'theft' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <StickerTheft user={user} language={language} />
        </div>
      ) : activeGame === 'bomb' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <BombSticker user={user} language={language} />
        </div>
      ) : activeGame === 'raid' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <Raid user={user} language={language} />
        </div>
      ) : activeGame === 'puzzle' ? (
        <div>
          <button
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-semibold">{language === 'ru' ? 'Вернуться' : 'Back'}</span>
          </button>
          <PuzzleDrop user={user} language={language} />
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="text-purple-400" size={24} />
            <h2 className="text-xl font-bold text-white">{language === 'ru' ? 'Игровой Хаб' : 'Game Hub'}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Daily Spin Wheel */}
            <GameCard
              emoji="🎡"
              title="DAILY SPIN"
              description={language === 'ru' ? 'Крути колесо удачи' : 'Spin the wheel'}
              badge={{ label: 'NEW', color: 'bg-green-500' }}
              onClick={() => setActiveGame('spin')}
            />

            {/* Sticker Battle */}
            <GameCard
              emoji="⚔️"
              title="BATTLE"
              description={language === 'ru' ? 'Бой стикеров' : 'Sticker battle'}
              badge={{ label: 'HOT', color: 'bg-red-500' }}
              onClick={() => setActiveGame('battle')}
            />

            {/* Craft/Combine */}
            <GameCard
              emoji="🧩"
              title="CRAFT"
              description={language === 'ru' ? 'Комбинируй стикеры' : 'Combine stickers'}
              badge={{ label: 'BETA', color: 'bg-blue-500' }}
              onClick={() => setActiveGame('craft')}
            />

            {/* Guess the Price */}
            <GameCard
              emoji="🎯"
              title="PRICE"
              description={language === 'ru' ? 'Угадай цену' : 'Guess the price'}
              onClick={() => setActiveGame('price')}
            />

            {/* Sticker Theft */}
            <GameCard
              emoji="🎯"
              title="THEFT"
              description={language === 'ru' ? 'Укради стикеры' : 'Steal stickers'}
              badge={{ label: 'RISKY', color: 'bg-red-500' }}
              onClick={() => setActiveGame('theft')}
            />

            {/* Bomb Sticker */}
            <GameCard
              emoji="💣"
              title="BOMB"
              description={language === 'ru' ? 'Передай бомбу' : 'Pass the bomb'}
              badge={{ label: 'TIMED', color: 'bg-orange-500' }}
              onClick={() => setActiveGame('bomb')}
            />

            {/* Raid */}
            <GameCard
              emoji="⚔️"
              title="RAID"
              description={language === 'ru' ? 'Мультиплеер пул' : 'Multiplayer pool'}
              badge={{ label: 'SOCIAL', color: 'bg-blue-500' }}
              onClick={() => setActiveGame('raid')}
            />

            {/* Puzzle Drop */}
            <GameCard
              emoji="🧩"
              title="PUZZLE"
              description={language === 'ru' ? 'Собери стикеры' : 'Collect stickers'}
              badge={{ label: 'COLLECT', color: 'bg-green-500' }}
              onClick={() => setActiveGame('puzzle')}
            />
          </div>

          <Card className="bg-blue-500/10 border-blue-500/30 p-4 mt-6">
            <p className="text-sm text-blue-300">
              {language === 'ru'
                ? '🎮 Играй, зарабатывай SXTON и выигрывай редкие стикеры!'
                : '🎮 Play, earn SXTON and win rare stickers!'}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

// Game Card Component
const GameCard = ({ emoji, title, description, badge, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group relative h-32 rounded-xl bg-gradient-to-br from-[#2a2a3e]/80 to-[#1a1a2e]/80 border-2 border-cyan-500/30 p-3 active:border-cyan-400/60 transition-all duration-200 active:shadow-lg active:shadow-cyan-500/20 cursor-pointer overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-purple-500/0 group-hover:from-cyan-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
      
      {/* Badge */}
      {badge && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className={`${badge.color} text-white text-xs font-bold px-2 py-1`}>
            {badge.label}
          </Badge>
        </div>
      )}
      
      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-between z-10">
        {/* Emoji */}
        <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
          {emoji}
        </div>
        
        {/* Title */}
        <h3 className="text-sm font-black text-white text-center leading-tight">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-xs text-gray-300 text-center">
          {description}
        </p>
      </div>
    </button>
  );
};

export default Game;
