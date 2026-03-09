import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Gamepad2, Save, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const GameManagement = ({ adminToken }) => {
  const [settings, setSettings] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchPacks();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/admin/game-settings`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setSettings(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch game settings");
      console.error("Error fetching game settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPacks = async () => {
    try {
      const response = await axios.get(`${API}/sticker-packs`);
      setPacks(response.data);
    } catch (err) {
      console.error("Error fetching packs:", err);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    handleInputChange(field, numValue);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const url = `${API}/admin/game-settings`;
      console.log("API base:", API);
      console.log("Full URL:", url);
      console.log("Saving game settings with token:", adminToken?.substring(0, 10) + "...");
      console.log("Settings to save:", settings);
      
      const response = await axios.post(url, settings, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        }
      });
      
      console.log("Save response:", response.data);
      toast.success("Game settings updated successfully!");
      setError(null);
    } catch (err) {
      console.error("Save error:", err);
      console.error("Error details:", err.response?.status, err.response?.data);
      const errorMsg = err.response?.data?.detail || err.message || "Failed to save settings";
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-3"></div>
          <p className="text-gray-400">Loading game settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <p className="text-red-400">Failed to load game settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 className="text-purple-400" size={24} />
        <h2 className="text-2xl font-bold text-white">Game Settings</h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Sticker Theft Settings */}
      <Card className="bg-[#1a1a2e]/80 border-cyan-500/30 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🎯 Sticker Theft
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Cost (TON)
            </label>
            <Input
              type="number"
              step="0.01"
              value={settings.theft_cost_ton}
              onChange={(e) => handleNumberChange("theft_cost_ton", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Cooldown (hours)
            </label>
            <Input
              type="number"
              value={settings.theft_cooldown_hours}
              onChange={(e) => handleNumberChange("theft_cooldown_hours", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      </Card>

      {/* Bomb Sticker Settings */}
      <Card className="bg-[#1a1a2e]/80 border-cyan-500/30 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          💣 Bomb Sticker
        </h3>
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Expiration (hours)
          </label>
          <Input
            type="number"
            value={settings.bomb_expiration_hours}
            onChange={(e) => handleNumberChange("bomb_expiration_hours", e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </Card>

      {/* Raid Settings */}
      <Card className="bg-[#1a1a2e]/80 border-cyan-500/30 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          ⚔️ Raid
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Entry Cost (TON)
            </label>
            <Input
              type="number"
              step="0.01"
              value={settings.raid_entry_cost_ton}
              onChange={(e) => handleNumberChange("raid_entry_cost_ton", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Max Players
            </label>
            <Input
              type="number"
              value={settings.raid_max_players}
              onChange={(e) => handleNumberChange("raid_max_players", e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      </Card>

      {/* Puzzle Drop Settings */}
      <Card className="bg-[#1a1a2e]/80 border-cyan-500/30 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🧩 Puzzle Drop
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Fragment Cost (TON)
              </label>
              <Input
                type="number"
                step="0.01"
                value={settings.puzzle_fragment_cost_ton}
                onChange={(e) => handleNumberChange("puzzle_fragment_cost_ton", e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Drop Chance (0-1)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={settings.puzzle_fragment_drop_chance}
                onChange={(e) => handleNumberChange("puzzle_fragment_drop_chance", e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Fragments Needed
              </label>
              <Input
                type="number"
                value={settings.puzzle_fragments_needed}
                onChange={(e) => handleNumberChange("puzzle_fragments_needed", e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Reward Points
              </label>
              <Input
                type="number"
                value={settings.puzzle_reward_points}
                onChange={(e) => handleNumberChange("puzzle_reward_points", e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Reward Sticker Pack (for assembled puzzle)
            </label>
            <select
              value={settings.puzzle_reward_sticker_pack_id || ""}
              onChange={(e) => handleInputChange("puzzle_reward_sticker_pack_id", e.target.value || null)}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-sm"
            >
              <option value="">None - Use default rewards</option>
              {packs.map(pack => (
                <option key={pack.id} value={pack.id}>
                  {pack.name}
                </option>
              ))}
            </select>
            {settings.puzzle_reward_sticker_pack_id && (
              <p className="text-xs text-gray-500 mt-2">
                Players will receive a sticker from the selected pack upon completing the puzzle
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-cyan-500 hover:bg-cyan-600 text-white flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-500/10 border-blue-500/30 p-4">
        <div className="flex gap-2">
          <CheckCircle className="text-blue-400 flex-shrink-0" size={20} />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">💡 Game Settings Guide</p>
            <ul className="text-xs space-y-1">
              <li>• Adjust prices and mechanics for each mini-game</li>
              <li>• For Puzzle, select which sticker pack players receive when completing</li>
              <li>• Changes apply immediately to all new game instances</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GameManagement;
