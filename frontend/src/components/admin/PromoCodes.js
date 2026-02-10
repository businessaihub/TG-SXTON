import { useState } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Ticket, Plus, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const PromoCodes = ({ adminToken }) => {
  const [promoCodes, setPromoCodes] = useState([
    {
      id: "promo_1",
      code: "SXTON50",
      discount: 50,
      discountType: "percent",
      maxUses: 100,
      usedCount: 45,
      expiresAt: new Date(Date.now() + 7776000000).toISOString(),
      isActive: true
    },
    {
      id: "promo_2",
      code: "LAUNCH20",
      discount: 20,
      discountType: "percent",
      maxUses: 500,
      usedCount: 234,
      expiresAt: new Date(Date.now() + 2592000000).toISOString(),
      isActive: true
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [maxUses, setMaxUses] = useState("");
  const [showCodes, setShowCodes] = useState(false);

  const handleAddPromo = () => {
    if (!newCode.trim() || !discount || !maxUses) {
      toast.error("Fill all fields");
      return;
    }

    const promo = {
      id: `promo_${Date.now()}`,
      code: newCode.toUpperCase(),
      discount: parseInt(discount),
      discountType,
      maxUses: parseInt(maxUses),
      usedCount: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };

    setPromoCodes([promo, ...promoCodes]);
    setNewCode("");
    setDiscount("");
    setMaxUses("");
    setShowForm(false);
    toast.success("Promo code created!");
  };

  const handleDelete = (id) => {
    setPromoCodes(promoCodes.filter(p => p.id !== id));
    toast.success("Promo code deleted");
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
              <th className="px-4 py-3 text-left text-gray-400">Discount</th>
              <th className="px-4 py-3 text-right text-gray-400">Usage</th>
              <th className="px-4 py-3 text-left text-gray-400">Expires</th>
              <th className="px-4 py-3 text-center text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
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
                  <td className="px-4 py-3 text-amber-400 font-semibold">
                    {promo.discount}{promo.discountType === "percent" ? "%" : " TON"}
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
