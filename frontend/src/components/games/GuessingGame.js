import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Zap, RotateCcw, TrendingUp, Target } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const GuessingGame = ({ user, language }) => {
  const [currentSticker, setCurrentSticker] = useState(null);
  const [guessedPrice, setGuessedPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  // Load new sticker for guessing
  const loadNewSticker = async () => {
    if (!user || !user.id) return;

    try {
      setLoading(true);
      setError(null);
      setGuessedPrice("");
      setResult(null);

      const response = await axios.get(`${API}/game/guess-price/sticker`);
      setCurrentSticker(response.data);
    } catch (err) {
      console.error("Error loading sticker:", err);
      setError(err.response?.data?.detail || "Failed to load sticker");
    } finally {
      setLoading(false);
    }
  };

  // Submit guess
  const submitGuess = async () => {
    if (!user || !user.id || !currentSticker) return;
    if (!guessedPrice || parseFloat(guessedPrice) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await axios.post(
        `${API}/game/guess-price/submit?user_id=${user.id}&sticker_id=${currentSticker.sticker_id}&guessed_price=${parseFloat(guessedPrice)}`
      );

      setResult(response.data);
      loadGameHistory();
    } catch (err) {
      console.error("Error submitting guess:", err);
      setError(err.response?.data?.detail || "Failed to submit guess");
    } finally {
      setSubmitting(false);
    }
  };

  // Load game history
  const loadGameHistory = async () => {
    if (!user || !user.id) return;

    try {
      const response = await axios.get(
        `${API}/user/${user.id}/game/guess-price/history?limit=5`
      );
      setHistory(response.data.games || []);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  useEffect(() => {
    loadNewSticker();
    loadGameHistory();
  }, [user]);

  const getAccuracyColor = (grade) => {
    switch (grade) {
      case "EXCELLENT":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "GREAT":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "GOOD":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "OK":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-red-500/20 text-red-400 border-red-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-cyan-400" size={24} />
        <h1 className="text-2xl font-bold text-white">
          {language === "ru" ? "Гадай цену" : "Guess the Price"}
        </h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Game Section */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-3"></div>
            <p className="text-gray-400">Loading sticker...</p>
          </div>
        </div>
      ) : currentSticker && !result ? (
        <Card className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#2a1a3e]/80 border-cyan-500/20 p-6">
          {/* Sticker Image */}
          <div className="mb-6">
            <img
              src={currentSticker.image_url}
              alt={currentSticker.pack_name}
              className="w-full h-48 object-cover rounded-lg border-2 border-cyan-500/30"
            />
          </div>

          {/* Sticker Info */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-2">
              {currentSticker.pack_name}
            </h3>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              {currentSticker.rarity}
            </Badge>
          </div>

          {/* Game Instructions */}
          <p className="text-gray-300 mb-4 text-center">
            {language === "ru"
              ? "Сколько стоит этот стикер? Угадай цену! 💰"
              : "What's the price of this sticker? Make your guess! 💰"}
          </p>

          {/* Price Input */}
          <div className="space-y-3 mb-6">
            <label className="block text-sm text-gray-400">
              {language === "ru" ? "Твоя гадка (TON)" : "Your guess (TON)"}
            </label>
            <Input
              type="number"
              step="0.1"
              min="0"
              placeholder="0.0"
              value={guessedPrice}
              onChange={(e) => setGuessedPrice(e.target.value)}
              className="bg-[#0a0a0f] border-cyan-500/30 text-white placeholder-gray-600"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={submitGuess}
            disabled={submitting || !guessedPrice}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold py-3"
          >
            {submitting ? (
              language === "ru" ? "Отправляем..." : "Submitting..."
            ) : (
              <>
                <Zap size={18} className="mr-2" />
                {language === "ru" ? "Отправить гадку" : "Submit Guess"}
              </>
            )}
          </Button>
        </Card>
      ) : result ? (
        // Result View
        <div className="space-y-4">
          <Card
            className={`${getAccuracyColor(
              result.accuracy_grade
            )} border-2 p-6 text-center`}
          >
            <h2 className="text-3xl font-black mb-2">
              {result.accuracy_grade}! 🎉
            </h2>
            <p className="text-lg font-bold mb-4">
              +{result.sxton_reward} SXTON
            </p>
            <p className="text-sm opacity-80 mb-4">{result.message}</p>

            {/* Accuracy Details */}
            <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
              <div className="bg-black/20 rounded p-2">
                <p className="opacity-60 mb-1">Actual</p>
                <p className="font-bold">{result.actual_price} TON</p>
              </div>
              <div className="bg-black/20 rounded p-2">
                <p className="opacity-60 mb-1">Your Guess</p>
                <p className="font-bold">{result.guessed_price} TON</p>
              </div>
              <div className="bg-black/20 rounded p-2">
                <p className="opacity-60 mb-1">Accuracy</p>
                <p className="font-bold">{result.accuracy_percent}%</p>
              </div>
            </div>

            {/* Play Again Button */}
            <Button
              onClick={loadNewSticker}
              className="w-full bg-white/20 hover:bg-white/30 text-white"
            >
              <RotateCcw size={16} className="mr-2" />
              {language === "ru" ? "Еще раз" : "Play Again"}
            </Button>
          </Card>
        </div>
      ) : null}

      {/* Game Stats */}
      {history.length > 0 && (
        <Card className="bg-[#1a1a2e]/80 border-cyan-500/20 p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            {language === "ru" ? "Твоя статистика" : "Your Stats"}
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {history.length}
              </p>
              <p className="text-xs text-gray-400">
                {language === "ru" ? "Игр" : "Games"}
              </p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-center">
              <p className="text-2xl font-bold text-green-400">
                {history.reduce((sum, g) => sum + g.sxton_reward, 0)}
              </p>
              <p className="text-xs text-gray-400">SXTON</p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-3 text-center">
              <p className="text-2xl font-bold text-cyan-400">
                {(
                  history.reduce((sum, g) => sum + g.accuracy_percent, 0) /
                  history.length
                ).toFixed(1)}
                %
              </p>
              <p className="text-xs text-gray-400">
                {language === "ru" ? "Точность" : "Accuracy"}
              </p>
            </div>
          </div>

          {/* Recent Games */}
          <h4 className="text-sm font-bold text-gray-300 mb-3">
            {language === "ru" ? "Последние игры" : "Recent games"}
          </h4>
          <div className="space-y-2">
            {history.map((game, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-black/20 rounded p-3 text-xs"
              >
                <div>
                  <p className="text-white font-semibold">
                    {game.accuracy_percent}%
                  </p>
                  <p className="text-gray-400">
                    {game.actual_price} TON vs {game.guessed_price} TON
                  </p>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  +{game.sxton_reward}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* How to Play */}
      <Card className="bg-blue-500/10 border-blue-500/30 p-4">
        <h4 className="font-bold text-blue-300 mb-2">
          {language === "ru" ? "Как играть" : "How to Play"}
        </h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• {language === "ru" ? "Угадай цену стикера" : "Guess the sticker price"}</li>
          <li>
            • {language === "ru"
              ? "Чем точнее, тем больше SXTON"
              : "More accuracy = more SXTON"}
          </li>
          <li>
            • {language === "ru"
              ? "90%+ = 100 SXTON, 75%+ = 75 SXTON и т.д."
              : "90%+ = 100 SXTON, 75%+ = 75 SXTON, etc."}
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default GuessingGame;
