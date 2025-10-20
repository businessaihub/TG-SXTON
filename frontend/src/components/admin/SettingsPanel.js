import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card } from "../ui/card";
import { Coins, Settings as SettingsIcon, TrendingUp, Gift } from "lucide-react";
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
    <div className="space-y-6 relative" data-testid="admin-settings">
      {/* Cosmic background */}
      <div className="cosmic-bg"></div>
      
      <div className="relative z-10">
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Settings
        </h2>
        <p className="text-gray-400">Configure platform settings</p>
      </div>

      <Tabs defaultValue="general" className="w-full relative z-10">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10">
          <TabsTrigger value="general" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500">
            <SettingsIcon size={16} className="mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="rewards" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500">
            <Gift size={16} className="mr-2" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="sxton" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500">
            <Coins size={16} className="mr-2" />
            SXTON Token
          </TabsTrigger>
          <TabsTrigger value="referral" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500">
            <TrendingUp size={16} className="mr-2" />
            Referral
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="glass-card p-6 border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <h3 className="text-xl font-semibold text-white mb-4 relative z-10">Commission Settings</h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
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
            <div className="flex items-center justify-between mt-4 relative z-10">
              <label className="text-sm text-gray-400">No Commission Mode</label>
              <Switch
                checked={settings?.no_commission_mode || false}
                onCheckedChange={(checked) => setSettings({...settings, no_commission_mode: checked})}
              />
            </div>
          </div>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <div className="glass-card p-6 border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <h3 className="text-xl font-semibold text-white mb-4 relative z-10">Rewards Settings</h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
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
            <div className="space-y-2 mt-4 relative z-10">
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
        </TabsContent>

        {/* SXTON Token Tab */}
        <TabsContent value="sxton" className="space-y-6">
          <div className="glass-card p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <Coins className="text-purple-400" size={28} />
              <h3 className="text-xl font-semibold text-white">SXTON Token Configuration</h3>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="p-4 rounded-lg bg-white/5 border border-purple-500/30">
                <h4 className="text-lg font-semibold text-white mb-3">Distribution Rules</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Points per Purchase</label>
                    <Input
                      type="number"
                      value={settings?.points_per_purchase || 500}
                      onChange={(e) => setSettings({...settings, points_per_purchase: parseFloat(e.target.value)})}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Points per Burn</label>
                    <Input
                      type="number"
                      value={settings?.burn_reward_default || 100}
                      onChange={(e) => setSettings({...settings, burn_reward_default: parseFloat(e.target.value)})}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-pink-500/30">
                <h4 className="text-lg font-semibold text-white mb-3">Token Economy</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Enable Token Spending</span>
                    <Switch
                      checked={settings?.sxton_spending_enabled ?? true}
                      onCheckedChange={(checked) => setSettings({...settings, sxton_spending_enabled: checked})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Minimum Token Balance</label>
                    <Input
                      type="number"
                      value={settings?.min_token_balance || 0}
                      onChange={(e) => setSettings({...settings, min_token_balance: parseFloat(e.target.value)})}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/30">
                <h4 className="text-lg font-semibold text-white mb-3">Transaction History</h4>
                <p className="text-sm text-gray-400 mb-2">Track all SXTON token movements and user balances</p>
                <Button 
                  variant="outline" 
                  className="w-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30"
                >
                  View Transaction Logs
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Referral Tab */}
        <TabsContent value="referral" className="space-y-6">
          <div className="glass-card p-6 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <h3 className="text-xl font-semibold text-white mb-4 relative z-10">Referral Settings</h3>
            <div className="grid grid-cols-2 gap-4 relative z-10">
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
        </TabsContent>
      </Tabs>

      <Button
        onClick={handleSave}
        data-testid="save-settings-btn"
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-colors shadow-lg relative z-10"
      >
        Save All Settings
      </Button>
    </div>
  );
};

export default SettingsPanel;