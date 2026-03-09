import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "../../App";
import { RotateCcw, Zap, Clock, Gift } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

const DailySpinWheel = ({ user, language }) => {
  const [spinData, setSpinData] = useState(null);
  const [canSpin, setCanSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState(null);
  const [history, setHistory] = useState([]);
  const [nextSpinTime, setNextSpinTime] = useState(null);
  const [timeUntilSpin, setTimeUntilSpin] = useState(null);
  const [error, setError] = useState(null);
  const wheelRef = useRef(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  // Segments on the wheel (8 segments)
  const segments = [
    { label: "10 SXTON", color: "#F59E0B", type: "sxton" },
    { label: "25 SXTON", color: "#10B981", type: "sxton" },
    { label: "🎟️ Promo", color: "#8B5CF6", type: "promo" },
    { label: "50 SXTON", color: "#F59E0B", type: "sxton" },
    { label: "🎫 Sticker", color: "#EC4899", type: "sticker" },
    { label: "100 SXTON", color: "#F59E0B", type: "sxton" },
    { label: "🎟️ Promo", color: "#8B5CF6", type: "promo" },
    { label: "75 SXTON", color: "#F59E0B", type: "sxton" }
  ];

  // Check if can spin
  const checkSpin = async () => {
    if (!user || !user.id) return;

    try {
      const response = await axios.get(`${API}/game/daily-spin/check?user_id=${user.id}`);
      setCanSpin(response.data.can_spin);
      setNextSpinTime(response.data.next_spin_time);
      
      if (!response.data.can_spin && response.data.next_spin_time) {
        calculateTimeUntilSpin(response.data.next_spin_time);
      }
    } catch (err) {
      console.error("Error checking spin:", err);
      setError(err.response?.data?.detail || "Failed to check spin status");
    }
  };

  // Calculate time until next spin
  const calculateTimeUntilSpin = (nextTime) => {
    const interval = setInterval(() => {
      if (!nextTime) {
        clearInterval(interval);
        return;
      }
      
      const nextDate = new Date(nextTime);
      const now = new Date();
      const diff = nextDate - now;

      if (diff <= 0) {
        setTimeUntilSpin(null);
        setCanSpin(true);
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setTimeUntilSpin(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  // Load history
  const loadHistory = async () => {
    if (!user || !user.id) return;

    try {
      const response = await axios.get(`${API}/user/${user.id}/game/daily-spin/history?limit=7`);
      setHistory(response.data);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  // Perform spin
  const performSpin = async () => {
    if (!user || !user.id || !canSpin) return;

    try {
      setSpinning(true);
      setError(null);

      // Animate wheel
      const finalRotation = Math.random() * 360 + 1800; // At least 5 full rotations
      setWheelRotation(finalRotation);

      // Call API
      const response = await axios.post(`${API}/game/daily-spin/spin?user_id=${user.id}`);

      // Show reward after animation
      setTimeout(() => {
        setReward(response.data.reward);
        setCanSpin(false);
        setNextSpinTime(response.data.next_spin_time);
        calculateTimeUntilSpin(response.data.next_spin_time);
        loadHistory();
        setSpinning(false);
      }, 3000);
    } catch (err) {
      console.error("Error spinning:", err);
      setError(err.response?.data?.detail || "Failed to spin");
      setSpinning(false);
    }
  };

  useEffect(() => {
    checkSpin();
    loadHistory();

    // Setup timer for next spin countdown
    if (nextSpinTime) {
      const cleanup = calculateTimeUntilSpin(nextSpinTime);
      return cleanup;
    }
  }, [user?.id]);

  const getRewardColor = (type) => {
    switch (type) {
      case "sxton":
        return "bg-yellow-500/20 border-yellow-500/30 text-yellow-300";
      case "promo":
        return "bg-purple-500/20 border-purple-500/30 text-purple-300";
      case "sticker":
        return "bg-pink-500/20 border-pink-500/30 text-pink-300";
      default:
        return "bg-gray-500/20 border-gray-500/30 text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="text-yellow-400" size={24} />
        <h1 className="text-2xl font-bold text-white">
          {language === "ru" ? "Ежедневный спин" : "Daily Spin"}
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
            ? "🎡 Крутите колесо каждый день и выигрывайте SXTON, промокоды и стикеры!"
            : "🎡 Spin the wheel daily and win SXTON, promo codes, and stickers!"}
        </p>
      </Card>

      {/* Wheel Container */}
      <Card className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#2a1a3e]/80 border-cyan-500/20 p-6 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative w-64 h-64">
            {/* Wheel */}
            <div
              ref={wheelRef}
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: spinning ? "transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none"
              }}
              className="w-full h-full relative"
            >
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full"
              >
                {segments.map((segment, idx) => {
                  const angle = (360 / segments.length) * idx;
                  const startAngle = angle * (Math.PI / 180);
                  const endAngle = ((angle + 360 / segments.length) * Math.PI) / 180;
                  const radius = 180;

                  const x1 = 200 + radius * Math.cos(startAngle);
                  const y1 = 200 + radius * Math.sin(startAngle);
                  const x2 = 200 + radius * Math.cos(endAngle);
                  const y2 = 200 + radius * Math.sin(endAngle);

                  const largeArc = 360 / segments.length > 180 ? 1 : 0;
                  const path = `M 200 200 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                  const textAngle = angle + 360 / segments.length / 2;
                  const textRad = (textAngle * Math.PI) / 180;
                  const textX = 200 + 120 * Math.cos(textRad);
                  const textY = 200 + 120 * Math.sin(textRad);

                  return (
                    <g key={idx}>
                      <path
                        d={path}
                        fill={segment.color}
                        stroke="#1a1a2e"
                        strokeWidth="2"
                        opacity="0.8"
                      />
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-bold"
                        fill="#ffffff"
                        style={{
                          transform: `rotate(${textAngle}deg)`,
                          transformOrigin: `${textX}px ${textY}px`
                        }}
                      >
                        {segment.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center pointer */}
            <div className="absolute inset-0 flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-8 h-8 bg-[#1a1a2e] rounded-full"></div>
              </div>
            </div>

            {/* Top pointer indicator */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-cyan-400"></div>
            </div>
          </div>
        </div>

        {/* Spin Button */}
        {reward ? (
          <div className="space-y-4">
            {/* Reward Display */}
            <div className={`border-4 rounded-lg p-6 ${getRewardColor(reward.type)}`}>
              <p className="text-5xl mb-3">✨</p>
              <p className="text-2xl font-bold mb-2">{reward.label}</p>
              <p className="text-sm text-gray-300">
                {language === "ru" ? "Добыча получена!" : "Reward claimed!"}
              </p>
            </div>

            {/* Next Spin Timer */}
            {timeUntilSpin && (
              <Card className="bg-orange-500/10 border-orange-500/30 p-4 flex items-center gap-2 justify-center">
                <Clock size={18} className="text-orange-400" />
                <div>
                  <p className="text-sm text-orange-300 font-semibold">
                    {language === "ru" ? "Следующий спин через" : "Next spin in"}
                  </p>
                  <p className="text-lg font-bold text-orange-400">{timeUntilSpin}</p>
                </div>
              </Card>
            )}

            {/* Spin Again Button */}
            <Button
              onClick={() => {
                setReward(null);
                checkSpin();
              }}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded-lg transition-all"
            >
              {language === "ru" ? "Закрыть" : "Close"}
            </Button>
          </div>
        ) : (
          <Button
            onClick={performSpin}
            disabled={!canSpin || spinning}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all text-lg"
          >
            {spinning ? (
              <div className="flex items-center gap-2 justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                {language === "ru" ? "крутим..." : "Spinning..."}
              </div>
            ) : canSpin ? (
              "🎡 " + (language === "ru" ? "Крутить колесо" : "Spin the Wheel")
            ) : (
              "⏳ " + (language === "ru" ? "Вернитесь завтра" : "Come back tomorrow")
            )}
          </Button>
        )}

        {!canSpin && timeUntilSpin && !reward && (
          <Card className="bg-orange-500/10 border-orange-500/30 p-4 mt-4 flex items-center gap-2 justify-center">
            <Clock size={18} className="text-orange-400" />
            <div>
              <p className="text-sm text-orange-300">
                {language === "ru" ? "Следующий спин через:" : "Next spin in:"}
              </p>
              <p className="text-lg font-bold text-orange-400">{timeUntilSpin}</p>
            </div>
          </Card>
        )}
      </Card>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3">
            {language === "ru" ? "История спинов" : "Spin History"}
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((spin) => (
              <Card key={spin.id} className="bg-[#1a1a2e]/50 border-cyan-500/20 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className={`${getRewardColor(spin.reward_type)} text-xs`}>
                      {spin.reward_label}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(spin.date).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySpinWheel;
