import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

// Fallback placeholder image (SVG data URL)
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='300' height='200' fill='%23667eea'/%3E%3Ctext x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20' fill='white' font-weight='bold'%3ESticker Pack%3C/text%3E%3Ctext x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%23ddd'%3ENo Image%3C/text%3E%3C/svg%3E";

const PRICE_TYPES = [
  { id: "TON", emoji: "💎", label: "TON", description: "Blockchain tokens" },
  { id: "STARS", emoji: "⭐", label: "STARS", description: "Telegram Stars" },
  { id: "SXTON", emoji: "🎫", label: "SXTON", description: "StickersXTon points" }
];

const EDITIONS = [
  { id: "common", emoji: "📦", label: "Common", description: "Regular pack", color: "bg-blue-500/20 border-blue-500/50" },
  { id: "limited_edition", emoji: "🔒", label: "Limited Edition", description: "Limited quantity", color: "bg-purple-500/20 border-purple-500/50" },
  { id: "legendary_edition", emoji: "👑", label: "Legendary Edition", description: "Rare collection", color: "bg-yellow-500/20 border-yellow-500/50" },
  { id: "seasonal", emoji: "🎄", label: "Seasonal", description: "Seasonal release", color: "bg-green-500/20 border-green-500/50" },
  { id: "exclusive", emoji: "⭐", label: "Exclusive", description: "Exclusive release", color: "bg-red-500/20 border-red-500/50" }
];

const PackManagement = () => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [imageUploadMode, setImageUploadMode] = useState("url"); // "url" or "file"
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    image_urls: [],
    price: 1,
    price_type: "TON",
    purchase_types: ["TON", "STARS", "SXTON"],
    requires_subscription: false,
    required_channel_id: "",
    required_channel_link: "",
    edition: "common",
    sticker_count: 0,
    is_featured: false,
    is_upcoming: false,
    burn_enabled: false,
    burn_reward_points: 100,
    show_number: false
  });

  useEffect(() => {
    fetchPacks();
  }, []);

  // Keep sticker_count in sync with image inputs
  useEffect(() => {
    setFormData((prev) => {
      const urlCount = prev.image_url ? 1 : 0;
      const filesCount = (prev.image_urls || []).length;
      const desired = imageUploadMode === "url" ? Math.max(urlCount, filesCount) : filesCount;
      if (prev.sticker_count === desired) return prev;
      return { ...prev, sticker_count: desired };
    });
  }, [imageUploadMode, formData.image_url, formData.image_urls]);

  const fetchPacks = async () => {
    try {
      const response = await axios.get(`${API}/packs`);
      setPacks(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching packs:", error);
      setLoading(false);
    }
  };

  // Main submit handler. Accepts optional event so it can be called directly
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const token = localStorage.getItem("admin_token");
    console.log('handleSubmit fired', { editingPack: !!editingPack, sticker_count: formData.sticker_count });
    try {
      // Inform about creation with current sticker count
      console.log(`Creating pack with ${formData.sticker_count} stickers`);
      toast(`Створюється пак з ${formData.sticker_count} стікерами…`);
      const payload = { ...formData, sticker_count: (formData.image_urls && formData.image_urls.length) || formData.sticker_count || 0 };
      let res = null;
      if (editingPack) {
        res = await axios.put(`${API}/admin/packs/${editingPack.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Pack updated successfully");
      } else {
        res = await axios.post(`${API}/admin/packs`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Pack created successfully");
      }
      setIsDialogOpen(false);
      setEditingPack(null);
      resetForm();
      await fetchPacks();
      return res;
    } catch (error) {
      toast.error("Error saving pack");
      console.error('handleSubmit error', error);
      throw error;
    }
  };

  // Wrapper called by the Create/Update button. Validates form and shows errors to user.
  const handleCreatePack = async (e) => {
    console.log('handleCreatePack invoked', { sticker_count: formData.sticker_count, imageUploadMode, name: formData.name });
    
    if (!(formData.sticker_count > 0)) {
      toast.error("Будь ласка, укажіть кількість стікерів");
      return;
    }
    if (!formData.name || formData.name.trim().length === 0) {
      toast.error("Будь ласка, введіть назву паку");
      return;
    }
    if (!formData.description || formData.description.trim().length === 0) {
      toast.error("Будь ласка, введіть опис паку");
      return;
    }
    if (imageUploadMode === 'url' && !formData.image_url) {
      toast.error("Будь ласка, введіть URL зображення");
      return;
    }
    if (imageUploadMode === 'file' && (!formData.image_urls || formData.image_urls.length === 0)) {
      toast.error("Будь ласка, завантажте хоча б одне зображення");
      return;
    }

    // Delegate to the main submit handler and return its promise so callers can await it.
    try {
      return await handleSubmit();
    } catch (err) {
      // error already logged in handleSubmit
      return;
    }
  };

  const handleDelete = async (packId) => {
    if (!window.confirm("Are you sure you want to delete this pack?")) return;
    
    const token = localStorage.getItem("admin_token");
    try {
      await axios.delete(`${API}/admin/packs/${packId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Pack deleted successfully");
      fetchPacks();
    } catch (error) {
      toast.error("Error deleting pack");
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Read files preserving order using Promise.all
    const readers = files.map((file, idx) => {
      return new Promise((resolve) => {
        if (file.size > 2 * 1024 * 1024) {
          resolve({ idx, error: true });
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve({ idx, data: reader.result });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((results) => {
      const ordered = results
        .filter(r => !r.error)
        .sort((a, b) => a.idx - b.idx)
        .map(r => r.data);
      if (ordered.length === 0) return;
      setFormData((prev) => {
        const nextImages = [...(prev.image_urls || []), ...ordered];
        return { ...prev, image_urls: nextImages, sticker_count: nextImages.length };
      });
      if (results.some(r => r.error)) {
        toast.error('Some images were skipped (max 2MB each)');
      }
    });
  };

  const removeImageAt = (index) => {
    setFormData((prev) => {
      const next = [...(prev.image_urls || [])];
      next.splice(index, 1);
      return { ...prev, image_urls: next, sticker_count: next.length };
    });
  };

  const onDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index));
  };

  const onDrop = (e, index) => {
    const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(from)) return;
    setFormData((prev) => {
      const next = [...(prev.image_urls || [])];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return { ...prev, image_urls: next, sticker_count: next.length };
    });
  };

  const onDragOver = (e) => { e.preventDefault(); };

  const handleEdit = (pack) => {
    setEditingPack(pack);
    const images = pack.image_urls || (pack.image_url ? [pack.image_url] : []);
    setFormData({
      name: pack.name,
      description: pack.description,
      image_url: pack.image_url,
      image_urls: images,
      price: pack.price,
      price_type: pack.price_type,
      purchase_types: pack.purchase_types || ["TON", "STARS", "SXTON"],
      requires_subscription: pack.requires_subscription || false,
      required_channel_id: pack.required_channel_id || "",
      required_channel_link: pack.required_channel_link || "",
      edition: pack.edition || "common",
      sticker_count: images.length,
      is_featured: pack.is_featured,
      is_upcoming: pack.is_upcoming,
      burn_enabled: pack.burn_enabled,
      burn_reward_points: pack.burn_reward_points,
      show_number: pack.show_number
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image_url: "",
      image_urls: [],
      price: 1,
      price_type: "TON",
      purchase_types: ["TON", "STARS", "SXTON"],
      requires_subscription: false,
      required_channel_id: "",
      required_channel_link: "",
      edition: "common",
      sticker_count: 0,
      is_featured: false,
      is_upcoming: false,
      burn_enabled: false,
      burn_reward_points: 100,
      show_number: false
    });
  };

  return (
    <div className="space-y-6" data-testid="admin-pack-management">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Pack Management
          </h2>
          <p className="text-gray-400">Create and manage sticker packs</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingPack(null);
                resetForm();
              }}
              data-testid="create-pack-btn"
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              <Plus size={18} className="mr-2" />
              Create Pack
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card-no-overflow border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingPack ? "Edit Pack" : "Create New Pack"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Pack Image</label>
                  <div className="flex gap-2 mb-2">
                    <Button
                      type="button"
                      onClick={() => setImageUploadMode("url")}
                      className={`flex-1 ${imageUploadMode === "url" ? "bg-cyan-500" : "bg-white/5"}`}
                    >
                      URL
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setImageUploadMode("file")}
                      className={`flex-1 ${imageUploadMode === "file" ? "bg-cyan-500" : "bg-white/5"}`}
                    >
                      Upload
                    </Button>
                  </div>
                  {imageUploadMode === "url" ? (
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                      className="bg-white/5 border-white/10 text-white"
                      required
                    />
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="bg-white/5 border-white/10 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
                      />
                      {formData.image_urls && formData.image_urls.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {formData.image_urls.map((src, idx) => (
                            <div key={idx} className="relative">
                              <img
                                src={src}
                                alt={`Preview ${idx + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border border-white/10"
                                draggable
                                onDragStart={(e) => onDragStart(e, idx)}
                                onDragOver={onDragOver}
                                onDrop={(e) => onDrop(e, idx)}
                              />
                              <div className="absolute bottom-0 left-0 bg-black/60 text-xs text-white px-1 rounded-tr">
                                #{idx + 1}
                              </div>
                              <button type="button" onClick={() => removeImageAt(idx)} className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 text-xs -translate-y-1/3 translate-x-1/3">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 block mb-2">Price Type</label>
                  <div className="space-y-2">
                    {PRICE_TYPES.map((type) => (
                      <label
                        key={type.id}
                        className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                          formData.price_type === type.id
                            ? "bg-cyan-500/20 border-cyan-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <input
                          type="radio"
                          value={type.id}
                          checked={formData.price_type === type.id}
                          onChange={(e) => setFormData({...formData, price_type: e.target.value})}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="text-white font-semibold flex items-center gap-2">
                            <span className="text-lg">{type.emoji}</span>
                            {type.label}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{type.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Sticker Count</label>
                  <Input
                    type="number"
                    value={formData.sticker_count}
                    onChange={(e) => setFormData({...formData, sticker_count: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400 block mb-2">Pack Edition / Category (For Marketing & Filtering)</label>
                <div className="space-y-2">
                  {EDITIONS.map((edition) => (
                    <label
                      key={edition.id}
                      className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                        formData.edition === edition.id
                          ? edition.color
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        value={edition.id}
                        checked={formData.edition === edition.id}
                        onChange={(e) => setFormData({...formData, edition: e.target.value})}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-white font-semibold flex items-center gap-2">
                          <span className="text-lg">{edition.emoji}</span>
                          {edition.label}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{edition.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 p-2 bg-white/5 rounded">💡 Individual sticker rarity is determined by filename (e.g., #1_legendary.png). This field is just for categorizing your pack.</p>
              </div>
              
              {/* Purchase Configuration */}
              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 space-y-3">
                <h4 className="text-sm font-semibold text-cyan-400">Purchase Configuration</h4>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Allowed Purchase Types</label>
                  <div className="flex gap-3">
                    {["TON", "STARS", "SXTON"].map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.purchase_types.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, purchase_types: [...formData.purchase_types, type]});
                            } else {
                              setFormData({...formData, purchase_types: formData.purchase_types.filter(t => t !== type)});
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-white">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Require Channel Subscription</label>
                  <Switch
                    checked={formData.requires_subscription}
                    onCheckedChange={(checked) => setFormData({...formData, requires_subscription: checked})}
                  />
                </div>
                
                {formData.requires_subscription && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Channel ID</label>
                      <Input
                        value={formData.required_channel_id}
                        onChange={(e) => setFormData({...formData, required_channel_id: e.target.value})}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="@yourchannel"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Channel Link</label>
                      <Input
                        value={formData.required_channel_link}
                        onChange={(e) => setFormData({...formData, required_channel_link: e.target.value})}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="https://t.me/yourchannel"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Featured</label>
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({...formData, is_featured: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Upcoming</label>
                  <Switch
                    checked={formData.is_upcoming}
                    onCheckedChange={(checked) => setFormData({...formData, is_upcoming: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Burn Enabled</label>
                  <Switch
                    checked={formData.burn_enabled}
                    onCheckedChange={(checked) => setFormData({...formData, burn_enabled: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Show Number</label>
                  <Switch
                    checked={formData.show_number}
                    onCheckedChange={(checked) => setFormData({...formData, show_number: checked})}
                  />
                </div>
              </div>
              
              {formData.burn_enabled && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Burn Reward Points</label>
                  <Input
                    type="number"
                    value={formData.burn_reward_points}
                    onChange={(e) => setFormData({...formData, burn_reward_points: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              )}
              
              <Button
                type="button"
                disabled={!(formData.sticker_count > 0)}
                onClick={handleCreatePack}
                className={`w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {editingPack ? "Update Pack" : "Create Pack"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Packs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packs.map((pack) => (
          <div key={pack.id} className="glass-card p-4" data-testid={`admin-pack-${pack.id}`}>
            <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center overflow-hidden">
              <img
                src={imageErrors[pack.id] ? FALLBACK_IMAGE : (pack.image_url || FALLBACK_IMAGE)}
                alt={pack.name}
                className="w-full h-full object-cover"
                onError={() => setImageErrors({...imageErrors, [pack.id]: true})}
              />
            </div>
            <h3 className="font-semibold text-white mb-1">{pack.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{pack.description}</p>
            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge className="bg-cyan-500/20 text-cyan-400">{pack.price} {pack.price_type}</Badge>
              <Badge className="bg-purple-500/20 text-purple-400">{pack.edition || pack.rarity || 'common'}</Badge>
              {pack.is_featured && <Badge className="bg-yellow-500/20 text-yellow-400">Featured</Badge>}
              {pack.burn_enabled && <Badge className="bg-orange-500/20 text-orange-400">Burnable</Badge>}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(pack)}
                data-testid={`edit-pack-${pack.id}`}
                className="flex-1"
              >
                <Edit size={14} className="mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(pack.id)}
                data-testid={`delete-pack-${pack.id}`}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PackManagement;