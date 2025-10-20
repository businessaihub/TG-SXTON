import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PackManagement = () => {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [imageUploadMode, setImageUploadMode] = useState("url"); // "url" or "file"
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    price: 1,
    price_type: "TON",
    purchase_types: ["TON", "STARS", "SXTON"],
    requires_subscription: false,
    required_channel_id: "",
    required_channel_link: "",
    rarity: "common",
    sticker_count: 5,
    is_featured: false,
    is_upcoming: false,
    burn_enabled: false,
    burn_reward_points: 100,
    show_number: false
  });

  useEffect(() => {
    fetchPacks();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    
    try {
      if (editingPack) {
        await axios.put(`${API}/admin/packs/${editingPack.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Pack updated successfully");
      } else {
        await axios.post(`${API}/admin/packs`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Pack created successfully");
      }
      setIsDialogOpen(false);
      setEditingPack(null);
      resetForm();
      fetchPacks();
    } catch (error) {
      toast.error("Error saving pack");
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

  const handleEdit = (pack) => {
    setEditingPack(pack);
    setFormData({
      name: pack.name,
      description: pack.description,
      image_url: pack.image_url,
      price: pack.price,
      price_type: pack.price_type,
      purchase_types: pack.purchase_types || ["TON", "STARS", "SXTON"],
      requires_subscription: pack.requires_subscription || false,
      required_channel_id: pack.required_channel_id || "",
      required_channel_link: pack.required_channel_link || "",
      rarity: pack.rarity,
      sticker_count: pack.sticker_count,
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
      price: 1,
      price_type: "TON",
      purchase_types: ["TON", "STARS", "SXTON"],
      requires_subscription: false,
      required_channel_id: "",
      required_channel_link: "",
      rarity: "common",
      sticker_count: 5,
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
          <DialogContent className="glass-card border-white/10 text-white max-w-2xl">
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
                  <label className="text-sm text-gray-400">Image URL</label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
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
                  <label className="text-sm text-gray-400">Price Type</label>
                  <Select value={formData.price_type} onValueChange={(v) => setFormData({...formData, price_type: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="TON">TON</SelectItem>
                      <SelectItem value="STARS">STARS</SelectItem>
                      <SelectItem value="SXTON">SXTON</SelectItem>
                    </SelectContent>
                  </Select>
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
                <label className="text-sm text-gray-400">Rarity</label>
                <Select value={formData.rarity} onValueChange={(v) => setFormData({...formData, rarity: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>
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
              
              <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600">
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
            <img
              src={pack.image_url}
              alt={pack.name}
              className="w-full h-32 object-cover rounded-lg mb-3"
            />
            <h3 className="font-semibold text-white mb-1">{pack.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{pack.description}</p>
            <div className="flex gap-2 mb-3 flex-wrap">
              <Badge className="bg-cyan-500/20 text-cyan-400">{pack.price} {pack.price_type}</Badge>
              <Badge className="bg-purple-500/20 text-purple-400">{pack.rarity}</Badge>
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