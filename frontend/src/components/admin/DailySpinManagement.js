import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Gift, Plus, X, Settings } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const DailySpinManagement = ({ language = "en" }) => {
  const [settings, setSettings] = useState(null);
  const [availablePacks, setAvailablePacks] = useState([]);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("packs"); // 'packs', 'promos', 'weights'
  const [weights, setWeights] = useState({ sxton: 40, promo: 30, sticker: 30 });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, packsRes, promosRes] = await Promise.all([
        axios.get(`${API}/admin/daily-spin-settings`),
        axios.get(`${API}/admin/available-sticker-packs`),
        axios.get(`${API}/admin/available-promo-codes`)
      ]);

      setSettings(settingsRes.data);
      setAvailablePacks(packsRes.data);
      setAvailablePromos(promosRes.data);
      setWeights(settingsRes.data.reward_weights);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.response?.data?.detail || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Add sticker pack
  const addStickerPack = async (packId) => {
    try {
      setError(null);
      await axios.post(`${API}/admin/daily-spin-settings/add-sticker-pack?pack_id=${packId}`);
      setSuccess("Sticker pack added!");
      setTimeout(() => setSuccess(null), 2000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add pack");
    }
  };

  // Remove sticker pack
  const removeStickerPack = async (packId) => {
    try {
      setError(null);
      await axios.post(`${API}/admin/daily-spin-settings/remove-sticker-pack?pack_id=${packId}`);
      setSuccess("Sticker pack removed!");
      setTimeout(() => setSuccess(null), 2000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to remove pack");
    }
  };

  // Add promo code
  const addPromoCode = async (promoId) => {
    try {
      setError(null);
      await axios.post(`${API}/admin/daily-spin-settings/add-promo-code?promo_id=${promoId}`);
      setSuccess("Promo code added!");
      setTimeout(() => setSuccess(null), 2000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add promo");
    }
  };

  // Remove promo code
  const removePromoCode = async (promoId) => {
    try {
      setError(null);
      await axios.post(`${API}/admin/daily-spin-settings/remove-promo-code?promo_id=${promoId}`);
      setSuccess("Promo code removed!");
      setTimeout(() => setSuccess(null), 2000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to remove promo");
    }
  };

  // Update weights
  const updateWeights = async () => {
    try {
      setError(null);
      const total = weights.sxton + weights.promo + weights.sticker;
      if (total !== 100) {
        setError("Weights must sum to 100");
        return;
      }

      await axios.put(
        `${API}/admin/daily-spin-settings/weights?sxton=${weights.sxton}&promo=${weights.promo}&sticker=${weights.sticker}`
      );
      setSuccess("Weights updated!");
      setTimeout(() => setSuccess(null), 2000);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update weights");
    }
  };

  const getPromoInfo = (promo) => {
    let info = promo.bonus_type;
    if (promo.bonus_type === "discount") {
      info += ` ${promo.bonus_value}%`;
    } else if (promo.bonus_type === "sxton") {
      info += ` +${promo.bonus_value}`;
    } else if (promo.bonus_type === "sticker") {
      info += ` ${promo.bonus_value}x`;
    }
    return info;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-3"></div>
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Gift className="text-yellow-400" size={24} />
        <h1 className="text-3xl font-bold text-white">
          {language === "ru" ? "Управление Daily Spin" : "Daily Spin Management"}
        </h1>
        <Settings size={24} className="text-cyan-400 ml-auto" />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400 text-sm">✓ {success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3 border-b border-cyan-500/20">
        <button
          onClick={() => setActiveTab("packs")}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            activeTab === "packs"
              ? "text-cyan-400 border-cyan-400"
              : "text-gray-400 border-transparent hover:text-cyan-300"
          }`}
        >
          📦 {language === "ru" ? "Пакеты" : "Sticker Packs"}
        </button>
        <button
          onClick={() => setActiveTab("promos")}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            activeTab === "promos"
              ? "text-cyan-400 border-cyan-400"
              : "text-gray-400 border-transparent hover:text-cyan-300"
          }`}
        >
          🎟️ {language === "ru" ? "Промокоды" : "Promo Codes"}
        </button>
        <button
          onClick={() => setActiveTab("weights")}
          className={`px-4 py-2 font-bold border-b-2 transition-colors ${
            activeTab === "weights"
              ? "text-cyan-400 border-cyan-400"
              : "text-gray-400 border-transparent hover:text-cyan-300"
          }`}
        >
          ⚖️ {language === "ru" ? "Веса" : "Weights"}
        </button>
      </div>

      {/* PACKS TAB */}
      {activeTab === "packs" && (
        <div className="space-y-6">
          {/* Selected Packs */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              {language === "ru" ? "Выбранные пакеты" : "Selected Packs"}
            </h2>
            {settings?.selected_sticker_packs.length === 0 ? (
              <Card className="bg-orange-500/10 border-orange-500/30 p-4">
                <p className="text-orange-300 text-sm">
                  {language === "ru" ? "Пакеты не выбраны" : "No packs selected"}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {settings?.selected_sticker_packs.map((pack) => (
                  <Card key={pack.id} className="bg-cyan-500/10 border-cyan-500/30 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{pack.name}</p>
                      <p className="text-xs text-gray-400">ID: {pack.id.slice(0, 8)}...</p>
                    </div>
                    <button
                      onClick={() => removeStickerPack(pack.id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors text-red-400"
                    >
                      <X size={18} />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available Packs to Add */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              {language === "ru" ? "Доступные пакеты" : "Available Packs"}
            </h2>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {availablePacks.map((pack) => {
                const isSelected = settings?.selected_sticker_packs.some((p) => p.id === pack.id);
                return (
                  <Card
                    key={pack.id}
                    className={`p-4 flex items-center justify-between ${
                      isSelected
                        ? "bg-green-500/10 border-green-500/30 opacity-50"
                        : "bg-[#1a1a2e]/50 border-cyan-500/20 hover:border-cyan-400/60"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white">{pack.name}</p>
                      <p className="text-xs text-gray-400">ID: {pack.id.slice(0, 8)}...</p>
                    </div>
                    {!isSelected && (
                      <button
                        onClick={() => addStickerPack(pack.id)}
                        className="p-2 hover:bg-green-500/20 rounded transition-colors text-green-400"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PROMOS TAB */}
      {activeTab === "promos" && (
        <div className="space-y-6">
          {/* Selected Promos */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              {language === "ru" ? "Выбранные промокоды" : "Selected Promo Codes"}
            </h2>
            {settings?.selected_promo_codes.length === 0 ? (
              <Card className="bg-orange-500/10 border-orange-500/30 p-4">
                <p className="text-orange-300 text-sm">
                  {language === "ru" ? "Промокоды не выбраны" : "No promo codes selected"}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {settings?.selected_promo_codes.map((promo) => (
                  <Card key={promo.id} className="bg-purple-500/10 border-purple-500/30 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">
                        {promo.code}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getPromoInfo(promo)}
                      </p>
                    </div>
                    <button
                      onClick={() => removePromoCode(promo.id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors text-red-400"
                    >
                      <X size={18} />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available Promos to Add */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">
              {language === "ru" ? "Доступные промокоды" : "Available Promo Codes"}
            </h2>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {availablePromos.map((promo) => {
                const isSelected = settings?.selected_promo_codes.some((p) => p.id === promo.id);
                return (
                  <Card
                    key={promo.id}
                    className={`p-4 flex items-center justify-between ${
                      isSelected
                        ? "bg-green-500/10 border-green-500/30 opacity-50"
                        : "bg-[#1a1a2e]/50 border-cyan-500/20 hover:border-cyan-400/60"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white">
                        {promo.code}
                        {!promo.active && <Badge className="bg-red-500/20 text-red-300 text-xs ml-2">Inactive</Badge>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {getPromoInfo(promo)}
                      </p>
                    </div>
                    {!isSelected && promo.active && (
                      <button
                        onClick={() => addPromoCode(promo.id)}
                        className="p-2 hover:bg-green-500/20 rounded transition-colors text-green-400"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WEIGHTS TAB */}
      {activeTab === "weights" && (
        <div className="space-y-6">
          <Card className="bg-blue-500/10 border-blue-500/30 p-4">
            <p className="text-sm text-blue-300">
              {language === "ru"
                ? "⚖️ Распределение вероятности наград (должно быть 100% всего)"
                : "⚖️ Reward distribution probability (must total 100%)"}
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-6">
            {/* SXTON Weight */}
            <div>
              <label className="block text-white font-bold mb-2">
                💰 SXTON ({weights.sxton}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.sxton}
                onChange={(e) => setWeights({ ...weights, sxton: parseInt(e.target.value) })}
                className="w-full h-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg appearance-none cursor-pointer"
              />
              <Input
                type="number"
                min="0"
                max="100"
                value={weights.sxton}
                onChange={(e) => setWeights({ ...weights, sxton: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                className="mt-2 bg-[#1a1a2e]/50 border-cyan-500/20"
              />
            </div>

            {/* Promo Weight */}
            <div>
              <label className="block text-white font-bold mb-2">
                🎟️ Promo Codes ({weights.promo}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.promo}
                onChange={(e) => setWeights({ ...weights, promo: parseInt(e.target.value) })}
                className="w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg appearance-none cursor-pointer"
              />
              <Input
                type="number"
                min="0"
                max="100"
                value={weights.promo}
                onChange={(e) => setWeights({ ...weights, promo: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                className="mt-2 bg-[#1a1a2e]/50 border-cyan-500/20"
              />
            </div>

            {/* Sticker Weight */}
            <div>
              <label className="block text-white font-bold mb-2">
                🎫 Stickers ({weights.sticker}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={weights.sticker}
                onChange={(e) => setWeights({ ...weights, sticker: parseInt(e.target.value) })}
                className="w-full h-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg appearance-none cursor-pointer"
              />
              <Input
                type="number"
                min="0"
                max="100"
                value={weights.sticker}
                onChange={(e) => setWeights({ ...weights, sticker: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                className="mt-2 bg-[#1a1a2e]/50 border-cyan-500/20"
              />
            </div>

            {/* Total */}
            <Card className={`p-4 ${weights.sxton + weights.promo + weights.sticker === 100
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
            }`}>
              <p className={`font-bold text-lg ${weights.sxton + weights.promo + weights.sticker === 100
                ? "text-green-400"
                : "text-red-400"
              }`}>
                {language === "ru" ? "Всего:" : "Total:"} {weights.sxton + weights.promo + weights.sticker}%
              </p>
            </Card>

            {/* Save Button */}
            <Button
              onClick={updateWeights}
              disabled={weights.sxton + weights.promo + weights.sticker !== 100}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all"
            >
              {language === "ru" ? "✓ Сохранить" : "✓ Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySpinManagement;
