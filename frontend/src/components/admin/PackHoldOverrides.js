import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Sliders, Edit2 } from "lucide-react";
import { toast } from "sonner";

const PackHoldOverrides = ({ adminToken }) => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPackId, setEditingPackId] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    fetchPacks();
  }, [adminToken]);

  const fetchPacks = async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API}/packs`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setPacks(response.data || []);
    } catch (error) {
      console.error("Error fetching packs:", error);
      toast.error("Failed to load packs");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverride = async (packId) => {
    const override = overrides[packId] || {};
    setSaving({ ...saving, [packId]: true });

    try {
      const params = new URLSearchParams({
        hold_enabled: override.hold_enabled !== false ? "true" : "false"
      });

      if (override.custom_days) {
        params.append("custom_days", override.custom_days);
      }

      if (override.custom_multiplier) {
        params.append("custom_multiplier", override.custom_multiplier);
      }

      await axios.put(
        `${API}/admin/packs/${packId}/hold-override?${params.toString()}`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      toast.success(`Pack overrides updated!`);
      setEditingPackId(null);
    } catch (error) {
      console.error("Error saving override:", error);
      toast.error("Failed to save pack override");
    } finally {
      setSaving({ ...saving, [packId]: false });
    }
  };

  if (loading) {
    return <div className="text-gray-400">Loading packs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Sliders size={24} className="text-purple-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          Pack-Level Hold Overrides
        </h2>
      </div>

      {/* Packs List */}
      <div className="space-y-2">
        {packs.map((pack) => (
          <div key={pack.id} className="glass-card p-4 border border-white/10 hover:border-purple-500/30 transition">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{pack.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {pack.sticker_count} stickers • ${pack.price} {pack.price_type}
                </p>

                {editingPackId === pack.id ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={overrides[pack.id]?.hold_enabled !== false}
                        onChange={(e) => {
                          setOverrides({
                            ...overrides,
                            [pack.id]: { ...overrides[pack.id], hold_enabled: e.target.checked }
                          });
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-300">Enable Hold Boost for this pack</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Custom Hold Days (optional)</label>
                        <Input
                          type="number"
                          placeholder="Leave empty for default"
                          value={overrides[pack.id]?.custom_days || ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            setOverrides({
                              ...overrides,
                              [pack.id]: { ...overrides[pack.id], custom_days: val }
                            });
                          }}
                          className="bg-slate-800/50 border-white/10 text-white h-7 text-xs"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Custom Multiplier (optional)</label>
                        <Input
                          type="number"
                          placeholder="e.g., 1.10"
                          value={overrides[pack.id]?.custom_multiplier || ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                            setOverrides({
                              ...overrides,
                              [pack.id]: { ...overrides[pack.id], custom_multiplier: val }
                            });
                          }}
                          className="bg-slate-800/50 border-white/10 text-white h-7 text-xs"
                          step="0.01"
                          min="1.0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    {pack.hold_enabled !== false && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        Hold Enabled {pack.custom_hold_days ? `(${pack.custom_hold_days} days)` : ""}
                      </Badge>
                    )}
                    {pack.hold_enabled === false && (
                      <Badge className="bg-gray-500/20 text-gray-400 text-xs">Hold Disabled</Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                {editingPackId === pack.id ? (
                  <>
                    <Button
                      onClick={() => handleSaveOverride(pack.id)}
                      disabled={saving[pack.id]}
                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30 h-7 text-xs px-2"
                    >
                      {saving[pack.id] ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingPackId(null);
                        setOverrides({ ...overrides, [pack.id]: {} });
                      }}
                      className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 h-7 text-xs px-2"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      setEditingPackId(pack.id);
                      setOverrides({
                        ...overrides,
                        [pack.id]: {
                          hold_enabled: pack.hold_enabled !== false,
                          custom_days: pack.custom_hold_days,
                          custom_multiplier: pack.custom_multiplier
                        }
                      });
                    }}
                    className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 h-7 text-xs px-2"
                  >
                    <Edit2 size={12} className="mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {packs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No packs found
        </div>
      )}
    </div>
  );
};

export default PackHoldOverrides;
