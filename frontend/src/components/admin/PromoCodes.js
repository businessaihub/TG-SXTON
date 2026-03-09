import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Ticket, Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const PromoCodes = ({ adminToken }) => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [promoType, setPromoType] = useState("discount");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [sxtonAmount, setSxtonAmount] = useState("");
  const [stickerRarity, setStickerRarity] = useState("common");
  const [packId, setPackId] = useState("");
  const [maxUses, setMaxUses] = useState("");

  useEffect(() => {
    fetchPromoCodes();
    fetchPacks();
  }, [adminToken]);

  const fetchPacks = async () => {
    if (!adminToken) return;
    try {
      const response = await axios.get(`${API}/admin/packs`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setPacks(response.data || []);
    } catch (error) {
      console.error("Error fetching packs:", error);
    }
  };

  const fetchPromoCodes = async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/promo-codes`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setPromoCodes(response.data);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPromo = async () => {
    console.log("handleAddPromo called", { adminToken, newCode, promoType, maxUses });
    
    if (!adminToken) {
      toast.error("Admin token missing");
      console.error("No adminToken available");
      return;
    }

    if (!newCode.trim() || !maxUses) {
      toast.error("Fill all required fields");
      return;
    }

    // Validate required fields based on type
    if (promoType === "discount" && (!discount)) {
      toast.error("Discount amount required");
      return;
    }
    if (promoType === "sxton_token" && (!sxtonAmount)) {
      toast.error("SXTON amount required");
      return;
    }
    if (promoType === "guaranteed_sticker" && (!stickerRarity || !packId)) {
      toast.error("Sticker rarity and pack selection required");
      return;
    }

    try {
      const payload = {
        code: newCode.toUpperCase(),
        promoType: promoType,
        maxUses: parseInt(maxUses),
        isActive: true
      };

      // Add type-specific fields
      if (promoType === "discount") {
        payload.discount = parseInt(discount);
        payload.discountType = discountType;
      } else if (promoType === "sxton_token") {
        payload.sxtonAmount = parseInt(sxtonAmount);
      } else if (promoType === "guaranteed_sticker") {
        payload.stickerRarity = stickerRarity;
        payload.packId = packId;
      }
      
      console.log("Final payload:", payload);
      console.log("Authorization header:", `Bearer ${adminToken}`);

      const response = await axios.post(
        `${API}/admin/promo-codes`,
        payload,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      
      console.log("Response:", response.data);

      toast.success("Promo code created!");
      setNewCode("");
      setPromoType("discount");
      setDiscount("");
      setDiscountType("percent");
      setSxtonAmount("");
      setStickerRarity("common");
      setPackId("");
      setMaxUses("");
      setShowForm(false);

      await fetchPromoCodes();
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error response status:", error.response?.status);
      console.error("Error response data:", JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 422) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          const message = detail.map(e => `${e.loc?.[1]}: ${e.msg}`).join(", ");
          toast.error(`Validation error: ${message}`);
        } else {
          toast.error("Validation error - check required fields");
        }
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.detail || "Code already exists");
      } else if (error.response?.status === 401) {
        toast.error("Unauthorized - please login again");
      } else {
        toast.error("Failed to create promo code");
      }
      console.error("Error:", error);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const handleToggle = (id) => {
    setPromoCodes(promoCodes.map(p =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const handleDelete = (id) => {
    setPromoCodes(promoCodes.filter(p => p.id !== id));
    toast.success("Promo code deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Ticket size={24} className="text-amber-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          Promo Codes & Discounts
        </h2>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 h-9"
        >
          <Plus size={16} className="mr-1" />
          New Code
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="glass-card p-6 border border-amber-500/20 space-y-4">
          <h3 className="text-lg font-semibold text-white">Create Promo Code</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Code</label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g., SUMMER20"
                className="bg-slate-800/50 border-white/10 text-white placeholder-gray-500 h-8 text-sm"
                maxLength={20}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">Type</label>
              <select
                value={promoType}
                onChange={(e) => setPromoType(e.target.value)}
                className="w-full bg-slate-800/50 border border-white/10 text-white px-3 h-8 text-sm rounded"
              >
                <option value="discount">Discount</option>
                <option value="sxton_token">SXTON Tokens</option>
                <option value="guaranteed_sticker">Guaranteed Sticker</option>
              </select>
            </div>

            {/* Discount Type Fields */}
            {promoType === "discount" && (
              <div className="col-span-2">
                <label className="text-sm text-gray-400 block mb-1">Discount</label>
                <div className="flex gap-2">
                  <Input
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    type="number"
                    placeholder="50"
                    className="bg-slate-800/50 border-white/10 text-white h-8 text-sm flex-1"
                    min="0"
                    max="100"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="bg-slate-800/50 border border-white/10 text-white px-2 h-8 text-sm rounded"
                  >
                    <option>percent</option>
                    <option>fixed</option>
                  </select>
                </div>
              </div>
            )}

            {/* SXTON Token Type Fields */}
            {promoType === "sxton_token" && (
              <div className="col-span-2">
                <label className="text-sm text-gray-400 block mb-1">SXTON Amount</label>
                <Input
                  value={sxtonAmount}
                  onChange={(e) => setSxtonAmount(e.target.value)}
                  type="number"
                  placeholder="500"
                  className="bg-slate-800/50 border-white/10 text-white h-8 text-sm"
                  min="1"
                />
              </div>
            )}

            {/* Guaranteed Sticker Type Fields */}
            {promoType === "guaranteed_sticker" && (
              <>
                <div className="col-span-2">
                  <label className="text-sm text-gray-400 block mb-1">Sticker Rarity</label>
                  <select
                    value={stickerRarity}
                    onChange={(e) => setStickerRarity(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 text-white px-3 h-8 text-sm rounded"
                  >
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-sm text-gray-400 block mb-1">Select Pack</label>
                  <select
                    value={packId}
                    onChange={(e) => setPackId(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 text-white px-3 h-8 text-sm rounded"
                  >
                    <option value="">-- Choose Pack --</option>
                    {packs.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} (${pack.price})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="text-sm text-gray-400 block mb-1">Max Uses</label>
              <Input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                type="number"
                placeholder="100"
                className="bg-slate-800/50 border-white/10 text-white h-8 text-sm"
                min="1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAddPromo}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-8"
            >
              Create Code
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 text-gray-300 h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Promo List */}
      <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-slate-800/50">
              <th className="px-4 py-3 text-left text-gray-400">Code</th>
              <th className="px-4 py-3 text-left text-gray-400">Type</th>
              <th className="px-4 py-3 text-left text-gray-400">Reward</th>
              <th className="px-4 py-3 text-right text-gray-400">Usage</th>
              <th className="px-4 py-3 text-left text-gray-400">Expires</th>
              <th className="px-4 py-3 text-center text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                  No promo codes yet
                </td>
              </tr>
            ) : (
              promoCodes.map((promo) => (
                <tr key={promo.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-cyan-400">{promo.code}</code>
                      <Badge className={promo.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {promo.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className={
                      promo.promoType === "discount" ? "text-amber-400" :
                      promo.promoType === "sxton_token" ? "text-blue-400" :
                      "text-purple-400"
                    }>
                      {promo.promoType === "discount" && "Discount"}
                      {promo.promoType === "sxton_token" && "SXTON"}
                      {promo.promoType === "guaranteed_sticker" && "Sticker"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {promo.promoType === "discount" && (
                      <span className="text-amber-400">
                        {promo.discount}{promo.discountType === "percent" ? "%" : " TON"}
                      </span>
                    )}
                    {promo.promoType === "sxton_token" && (
                      <span className="text-blue-400">{promo.sxtonAmount} SXTON</span>
                    )}
                    {promo.promoType === "guaranteed_sticker" && (
                      <div className="text-purple-400 text-xs">
                        <p className="capitalize">{promo.stickerRarity}</p>
                        <p className="text-gray-500 text-xs">{packs.find(p => p.id === promo.packId)?.name || "Unknown Pack"}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-right">
                      <p className="text-white">{promo.usedCount}/{promo.maxUses}</p>
                      <div className="w-24 h-1 bg-slate-700 rounded mt-1 ml-auto overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                          style={{ width: `${(promo.usedCount / promo.maxUses) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(promo.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleCopy(promo.code)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Copy code"
                      >
                        <Copy size={14} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleToggle(promo.id)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title={promo.isActive ? "Deactivate" : "Activate"}
                      >
                        {promo.isActive ? (
                          <Eye size={14} className="text-green-400" />
                        ) : (
                          <EyeOff size={14} className="text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/30 p-4 rounded border border-white/10 text-center">
          <p className="text-sm text-gray-400">Active Codes</p>
          <p className="text-2xl font-bold text-amber-400">{promoCodes.filter(p => p.isActive).length}</p>
        </div>
        <div className="bg-slate-800/30 p-4 rounded border border-white/10 text-center">
          <p className="text-sm text-gray-400">Total Redeemed</p>
          <p className="text-2xl font-bold text-cyan-400">{promoCodes.reduce((sum, p) => sum + p.usedCount, 0)}</p>
        </div>
        <div className="bg-slate-800/30 p-4 rounded border border-white/10 text-center">
          <p className="text-sm text-gray-400">Remaining Uses</p>
          <p className="text-2xl font-bold text-green-400">
            {promoCodes.reduce((sum, p) => sum + (p.maxUses - p.usedCount), 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PromoCodes;
