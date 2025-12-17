import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Card } from "../ui/card";
import { Coins, Settings as SettingsIcon, TrendingUp, Gift, Disc3, Flame } from "lucide-react";
import { toast } from "sonner";

const SettingsPanel = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const response = await axios.get(`${API}/packs`);
      setPacks(response.data);
    } catch (error) {
      console.error("Error fetching packs:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure all fields have default values if they don't exist
      const settingsWithDefaults = {
        ...response.data,
        spin_timeout: response.data?.spin_timeout ?? 3,
        roulette_selection_mode: response.data?.roulette_selection_mode ?? "random",
        roulette_stats: response.data?.roulette_stats ?? {
          total_spins: 0,
          total_revenue: 0.0,
          avg_win_value: 0.0
        }
      };
      setSettings(settingsWithDefaults);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("admin_token");
    console.log("Saving settings:", settings);
    console.log("Token:", token);
    try {
      const response = await axios.put(`${API}/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Settings saved response:", response.data);
      toast.success("Settings saved successfully");
      // Refresh settings after save
      await fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error.response?.data?.detail || "Error saving settings");
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
        <TabsList className="grid w-full grid-cols-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-white/10">
          <TabsTrigger value="general" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500">
            <SettingsIcon size={16} className="mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="roulette" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500">
            <Disc3 size={16} className="mr-2" />
            Roulette
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
          <TabsTrigger value="hot" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-orange-500">
            <Flame size={16} className="mr-2" />
            Hot Collections
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

        {/* Roulette Tab */}
        <TabsContent value="roulette" className="space-y-6">
          <div className="glass-card p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <h3 className="text-xl font-semibold text-white mb-4 relative z-10">Roulette Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Spin Price (TON)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={settings?.spin_price_ton || 1.0}
                    onChange={(e) => setSettings({...settings, spin_price_ton: parseFloat(e.target.value)})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <span className="text-gray-400 text-sm">TON</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Spin Timeout (seconds)</label>
                <Input
                  type="number"
                  value={settings?.spin_timeout || 3}
                  onChange={(e) => setSettings({...settings, spin_timeout: parseInt(e.target.value)})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="mt-6 relative z-10">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Roulette Selection Method</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                  <label className="text-sm text-gray-400">Random Pack Selection</label>
                  <Switch
                    checked={settings?.roulette_selection_mode !== "weighted"}
                    onCheckedChange={(checked) => setSettings({...settings, roulette_selection_mode: checked ? "random" : "weighted"})}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {settings?.roulette_selection_mode === "weighted" 
                    ? "✓ Using Weighted Random (by rarity)" 
                    : "✓ Using Uniform Random"}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Roulette Statistics</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs text-gray-500">Total Spins</div>
                  <div className="text-lg font-bold text-purple-400">{settings?.roulette_stats?.total_spins || 0}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs text-gray-500">Total Revenue</div>
                  <div className="text-lg font-bold text-cyan-400">{(settings?.roulette_stats?.total_revenue || 0).toFixed(2)} TON</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-xs text-gray-500">Avg Win Value</div>
                  <div className="text-lg font-bold text-emerald-400">{(settings?.roulette_stats?.avg_win_value || 0).toFixed(2)} TON</div>
                </div>
              </div>
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

        {/* Hot Collections Tab */}
        <TabsContent value="hot" className="space-y-6">
          <div className="glass-card p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-red-500/10 relative overflow-hidden">
            <div className="cosmic-particles"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <Flame className="text-orange-400" size={28} />
              <h3 className="text-xl font-semibold text-white">Hot Collections Management</h3>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="p-4 rounded-lg bg-white/5 border border-orange-500/30">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Selection Mode</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                    <label className="text-sm text-gray-400">Manual Selection</label>
                    <Switch
                      checked={settings?.hot_mode !== "auto"}
                      onCheckedChange={(checked) => setSettings({...settings, hot_mode: checked ? "manual" : "auto"})}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {settings?.hot_mode === "manual" 
                      ? "✓ Manually select hot collections" 
                      : "✓ Auto-select top trending packs"}
                  </p>
                </div>
              </div>

              {settings?.hot_mode === "manual" && (
                <div className="p-4 rounded-lg bg-white/5 border border-orange-500/30">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Select Top 5 Hot Packs</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {packs.map((pack) => (
                      <div key={pack.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{pack.name}</p>
                          <p className="text-xs text-gray-500">{pack.price} {pack.price_type}</p>
                        </div>
                        <Switch
                          checked={(settings?.hot_collections || []).includes(pack.id)}
                          onCheckedChange={(checked) => {
                            const current = settings?.hot_collections || [];
                            if (checked) {
                              if (current.length < 5) {
                                setSettings({...settings, hot_collections: [...current, pack.id]});
                              }
                            } else {
                              setSettings({...settings, hot_collections: current.filter(id => id !== pack.id)});
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Selected: {(settings?.hot_collections || []).length}/5</p>
                </div>
              )}

              <div className="p-4 rounded-lg bg-white/5 border border-cyan-500/30">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Preview</h4>
                <p className="text-xs text-gray-500 mb-3">Currently showing {(settings?.hot_collections || []).length} hot packs:</p>
                <div className="space-y-1">
                  {(settings?.hot_collections || []).slice(0, 5).map((packId, idx) => {
                    const pack = packs.find(p => p.id === packId);
                    return pack ? (
                      <div key={packId} className="text-xs text-orange-400 ml-2">
                        {idx + 1}. {pack.name} ({pack.price} {pack.price_type})
                      </div>
                    ) : null;
                  })}
                  {(settings?.hot_collections || []).length === 0 && (
                    <p className="text-xs text-gray-500">No hot packs selected yet</p>
                  )}
                </div>
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