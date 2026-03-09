import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { BarChart3, Settings } from "lucide-react";
import { toast } from "sonner";

const HoldSettings = ({ adminToken }) => {
  const [settings, setSettings] = useState({
    hold_threshold_days: 30,
    resale_multiplier: 1.05,
    badge_name: "Verified Holder",
    badge_color: null,
    boost_type: "both",
    is_enabled: true
  });

  const [monitoring, setMonitoring] = useState({
    total_active_holders: 0,
    packs_close_to_threshold: 0,
    average_hold_days: 0,
    hold_threshold_days: 30
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchMonitoring();
    
    // Refresh monitoring every 10 seconds
    const interval = setInterval(fetchMonitoring, 10000);
    return () => clearInterval(interval);
  }, [adminToken]);

  const fetchSettings = async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/hold-settings`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching hold settings:", error);
      toast.error("Failed to load hold settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoring = async () => {
    if (!adminToken) return;
    try {
      const response = await axios.get(`${API}/admin/hold-monitoring`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setMonitoring(response.data);
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/hold-settings`, settings, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      toast.success("Hold settings updated!");
      setEditMode(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading hold settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Settings size={24} className="text-amber-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          Hold Boost Settings
        </h2>
      </div>

      {/* Settings Panel */}
      <div className="glass-card p-6 border border-amber-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Configuration</h3>
          <Button
            onClick={() => setEditMode(!editMode)}
            className={editMode ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"}
          >
            {editMode ? "Cancel" : "Edit"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Hold Threshold */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Hold Threshold (days)</label>
            <Input
              type="number"
              value={settings.hold_threshold_days}
              onChange={(e) => setSettings({ ...settings, hold_threshold_days: parseInt(e.target.value) })}
              disabled={!editMode}
              className="bg-slate-800/50 border-white/10 text-white h-8 text-sm disabled:opacity-50"
              min="1"
              max="365"
            />
          </div>

          {/* Resale Multiplier */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Resale Multiplier</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={settings.resale_multiplier}
                onChange={(e) => setSettings({ ...settings, resale_multiplier: parseFloat(e.target.value) })}
                disabled={!editMode}
                className="bg-slate-800/50 border-white/10 text-white h-8 text-sm disabled:opacity-50"
                step="0.01"
                min="1.0"
                max="2.0"
              />
              <span className="text-gray-400 text-sm">({((settings.resale_multiplier - 1) * 100).toFixed(0)}% boost)</span>
            </div>
          </div>

          {/* Badge Name */}
          <div className="col-span-2">
            <label className="text-sm text-gray-400 block mb-1">Badge Name</label>
            <Input
              type="text"
              value={settings.badge_name}
              onChange={(e) => setSettings({ ...settings, badge_name: e.target.value })}
              disabled={!editMode}
              placeholder="e.g., Verified Holder"
              className="bg-slate-800/50 border-white/10 text-white h-8 text-sm disabled:opacity-50"
            />
          </div>

          {/* Boost Type */}
          <div className="col-span-2">
            <label className="text-sm text-gray-400 block mb-1">Boost Type</label>
            <select
              value={settings.boost_type}
              onChange={(e) => setSettings({ ...settings, boost_type: e.target.value })}
              disabled={!editMode}
              className="w-full bg-slate-800/50 border border-white/10 text-white px-3 h-8 text-sm rounded disabled:opacity-50"
            >
              <option value="price_multiplier">Price Multiplier Only</option>
              <option value="listing_priority">Listing Priority Only</option>
              <option value="both">Both (Price + Priority)</option>
            </select>
          </div>

          {/* Enable/Disable */}
          <div className="col-span-2">
            <label className="text-sm text-gray-400 block mb-1">Feature Status</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.is_enabled}
                onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                disabled={!editMode}
                className="w-4 h-4 rounded"
              />
              <span className={settings.is_enabled ? "text-green-400" : "text-red-400"}>
                {settings.is_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>

        {editMode && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Monitoring Panel */}
      <div className="glass-card p-6 border border-cyan-500/20 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">Real-time Monitoring</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/30 p-4 rounded border border-white/10">
            <p className="text-sm text-gray-400">Active Verified Holders</p>
            <p className="text-3xl font-bold text-green-400">{monitoring.total_active_holders}</p>
          </div>

          <div className="bg-slate-800/30 p-4 rounded border border-white/10">
            <p className="text-sm text-gray-400">Close to Threshold (25+ days)</p>
            <p className="text-3xl font-bold text-yellow-400">{monitoring.packs_close_to_threshold}</p>
          </div>

          <div className="bg-slate-800/30 p-4 rounded border border-white/10 col-span-2">
            <p className="text-sm text-gray-400">Average Hold Duration</p>
            <p className="text-3xl font-bold text-cyan-400">{monitoring.average_hold_days} days</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
          💡 Tip: Monitoring updates every 10 seconds. Use these metrics to evaluate Hold Boost effectiveness.
        </div>
      </div>
    </div>
  );
};

export default HoldSettings;
