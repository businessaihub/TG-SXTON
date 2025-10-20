import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Card } from "../ui/card";
import { toast } from "sonner";

const SettingsPanel = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      await axios.put(`${API}/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Error saving settings");
    }
  };

  if (loading) {
    return <div className="text-white">Loading settings...</div>;
  }

  return (
    <div className="space-y-6" data-testid="admin-settings">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Settings
        </h2>
        <p className="text-gray-400">Configure platform settings</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Commission Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Commission Rate (%)</label>
              <Input
                type="number"
                step="0.1"
                value={settings?.commission_rate || 0}
                onChange={(e) => setSettings({...settings, commission_rate: parseFloat(e.target.value)})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Minimum Sale Price (TON)</label>
              <Input
                type="number"
                step="0.1"
                value={settings?.min_sale_price || 0}
                onChange={(e) => setSettings({...settings, min_sale_price: parseFloat(e.target.value)})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <label className="text-sm text-gray-400">No Commission Mode</label>
            <Switch
              checked={settings?.no_commission_mode || false}
              onCheckedChange={(checked) => setSettings({...settings, no_commission_mode: checked})}
            />
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Rewards Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Points per Purchase</label>
              <Input
                type="number"
                value={settings?.points_per_purchase || 0}
                onChange={(e) => setSettings({...settings, points_per_purchase: parseFloat(e.target.value)})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Max Listings per Collection</label>
              <Input
                type="number"
                value={settings?.max_listings_per_collection || 0}
                onChange={(e) => setSettings({...settings, max_listings_per_collection: parseInt(e.target.value)})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Referral Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Level 1 Reward (%)</label>
              <Input
                type="number"
                step="0.1"
                value={settings?.referral_level1_percent || 0}
                onChange={(e) => setSettings({...settings, referral_level1_percent: parseFloat(e.target.value)})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Level 2 Reward (%)</label>
              <Input
                type="number"
                step="0.1"
                value={settings?.referral_level2_percent || 0}
                onChange={(e) => setSettings({...settings, referral_level2_percent: parseFloat(e.target.value)})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Roulette Settings</h3>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Spin Price (TON)</label>
            <Input
              type="number"
              step="0.1"
              value={settings?.spin_price_ton || 0}
              onChange={(e) => setSettings({...settings, spin_price_ton: parseFloat(e.target.value)})}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          data-testid="save-settings-btn"
          className="w-full bg-cyan-500 hover:bg-cyan-600"
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsPanel;