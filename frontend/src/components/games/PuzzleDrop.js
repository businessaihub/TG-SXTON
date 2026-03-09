import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Zap, Gift, Sparkles, Lock } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";

const PuzzleDrop = ({ user, language }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dropping, setDropping] = useState(false);
  const [assembling, setAssembling] = useState(false);

  const texts = {
    en: {
      title: "🧩 Puzzle Drop",
      description: "Collect fragments to assemble stickers",
      fragments: "Fragments Collected",
      reward: "🏆 Rare Sticker + 200 SXTON",
      dropFragment: "Drop for Fragment",
      assemble: "Assemble Sticker",
      collecting: "Collecting...",
      assembling: "Assembling...",
      collected: "Got a fragment!",
      assembled: "Sticker assembled!",
      complete: "Complete!",
      incomplete: "Collect more fragments...",
      dropChance: "30% chance to get a fragment",
      noProgress: "Start collecting fragments!",
      locked: "Locked",
    },
    uk: {
      title: "🧩 Паззл Дроп",
      description: "Збирай фрагменти щоб зібрати стікери",
      fragments: "Збрано Фрагментів",
      reward: "🏆 Рідкий Стікер + 200 SXTON",
      dropFragment: "Дропнути Фрагмент",
      assemble: "Зібрати Стікер",
      collecting: "Збираю...",
      assembling: "Збираю...",
      collected: "Отримав фрагмент!",
      assembled: "Стікер зібран!",
      complete: "Готово!",
      incomplete: "Збери більше фрагментів...",
      dropChance: "30% шанс отримати фрагмент",
      noProgress: "Почни збирати фрагменти!",
      locked: "Заблоковано",
    },
  };

  const t = texts[language] || texts.en;

  useEffect(() => {
    loadProgress();
  }, [user?.id]);

  const loadProgress = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API}/game/puzzle/status/${user.id}`);
      setProgress(res.data);
    } catch (err) {
      console.error("Error loading puzzle progress:", err);
      // Initialize empty progress
      setProgress({
        fragments_collected: 0,
        total_fragments_needed: 4,
        completed: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async () => {
    try {
      setDropping(true);
      const res = await axios.post(`${API}/game/puzzle/drop`, {
        user_id: user.id,
      });

      if (res.data.success) {
        toast.success(t.collected);
      } else {
        toast.info("Unfortunately nothing dropped this time");
      }
      await loadProgress();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to drop fragment");
    } finally {
      setDropping(false);
    }
  };

  const handleAssemble = async () => {
    if (!progress || progress.fragments_collected < 4) {
      toast.error("Need 4 fragments to assemble");
      return;
    }

    try {
      setAssembling(true);
      const res = await axios.post(`${API}/game/puzzle/assemble`, {
        user_id: user.id,
      });

      toast.success(res.data.message || t.assembled);
      await loadProgress();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to assemble");
    } finally {
      setAssembling(false);
    }
  };

  if (loading) {
    return <div className="animate-spin">⏳</div>;
  }

  const fragmentsRequired = progress?.total_fragments_needed || 4;
  const fragmentsCollected = progress?.fragments_collected || 0;
  const isComplete = fragmentsCollected >= fragmentsRequired;
  const progressPercent = (fragmentsCollected / fragmentsRequired) * 100;

  return (
    <div className="max-w-2xl">
      <Card className="p-6 mb-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧩</div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-gray-600">{t.description}</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-semibold">{t.fragments}</div>
            <div className="text-lg font-bold">
              {fragmentsCollected}/{fragmentsRequired}
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Fragment Visualization */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: fragmentsRequired }).map((_, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${
                i < fragmentsCollected
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {i < fragmentsCollected ? "✓" : i + 1}
            </div>
          ))}
        </div>

        {/* Reward Info */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded p-4 mb-6">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-amber-900">{t.reward}</h3>
              <p className="text-sm text-amber-700">{t.dropChance}</p>
            </div>
          </div>
        </div>

        {/* Drop Button */}
        <Button
          onClick={handleDrop}
          disabled={dropping}
          className="w-full bg-blue-600 hover:bg-blue-700 mb-3"
        >
          <Zap className="w-4 h-4 mr-2" />
          {dropping ? t.collecting : t.dropFragment}
        </Button>

        {/* Assemble Button */}
        <Button
          onClick={handleAssemble}
          disabled={!isComplete || assembling}
          className={`w-full ${
            isComplete
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {isComplete ? (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {assembling ? t.assembling : t.assemble}
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              {t.locked}
            </>
          )}
        </Button>
      </Card>

      {/* Status Card */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
        <h3 className="font-bold text-lg mb-3">📊 {t.title} Status</h3>

        {isComplete ? (
          <div className="text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-lg font-bold text-green-600">{t.complete}</p>
            <p className="text-sm text-gray-600 mt-2">
              Ready to assemble your sticker!
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl mb-3">🔄</div>
            <p className="text-gray-600">{t.incomplete}</p>
            <p className="text-sm text-gray-500 mt-2">
              {fragmentsRequired - fragmentsCollected} more to go
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PuzzleDrop;
