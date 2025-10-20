import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus, Edit, Trash2, ExternalLink, Image } from "lucide-react";
import { toast } from "sonner";

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    link_url: "",
    link_type: "channel",
    is_active: true,
    position: 0
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/admin/banners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBanners(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching banners:", error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    
    try {
      if (editingBanner) {
        await axios.put(`${API}/admin/banners/${editingBanner.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Banner updated successfully");
      } else {
        await axios.post(`${API}/admin/banners`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Banner created successfully");
      }
      setIsDialogOpen(false);
      setEditingBanner(null);
      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error("Error saving banner");
    }
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    
    const token = localStorage.getItem("admin_token");
    try {
      await axios.delete(`${API}/admin/banners/${bannerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Banner deleted successfully");
      fetchBanners();
    } catch (error) {
      toast.error("Error deleting banner");
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      cover_image_url: banner.cover_image_url || "",
      link_url: banner.link_url,
      link_type: banner.link_type,
      is_active: banner.is_active,
      position: banner.position
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      cover_image_url: "",
      link_url: "",
      link_type: "channel",
      is_active: true,
      position: 0
    });
  };

  return (
    <div className="space-y-6 relative" data-testid="admin-banner-management">
      <div className="cosmic-bg"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Banner Ads Management
          </h2>
          <p className="text-gray-400">Create and manage promotional banners</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingBanner(null);
                resetForm();
              }}
              data-testid="create-banner-btn"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} className="mr-2" />
              Create Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingBanner ? "Edit Banner" : "Create New Banner"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Link Type</label>
                  <Select value={formData.link_type} onValueChange={(v) => setFormData({...formData, link_type: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="channel">Telegram Channel</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
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
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Link URL</label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => setFormData({...formData, link_url: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="https://t.me/yourchannel or https://example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Cover Image URL (Optional)</label>
                <Input
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({...formData, cover_image_url: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Position (Display Order)</label>
                  <Input
                    type="number"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="flex items-center justify-between pt-6">
                  <label className="text-sm text-gray-400">Active</label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                {editingBanner ? "Update Banner" : "Create Banner"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Banners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {banners.map((banner) => (
          <div key={banner.id} className="glass-card p-4 border border-cyan-500/20 relative overflow-hidden" data-testid={`admin-banner-${banner.id}`}>
            <div className="cosmic-particles"></div>
            {banner.cover_image_url && (
              <img
                src={banner.cover_image_url}
                alt={banner.title}
                className="w-full h-32 object-cover rounded-lg mb-3 relative z-10"
              />
            )}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{banner.title}</h3>
                <Badge className={banner.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                  {banner.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-gray-400 mb-2">{banner.description}</p>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-cyan-500/20 text-cyan-400">
                  {banner.link_type === "channel" ? "Channel" : "Website"}
                </Badge>
                <Badge className="bg-purple-500/20 text-purple-400">
                  Position: {banner.position}
                </Badge>
              </div>
              <a
                href={banner.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mb-3"
              >
                <ExternalLink size={14} />
                {banner.link_url}
              </a>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(banner)}
                  data-testid={`edit-banner-${banner.id}`}
                  className="flex-1"
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(banner.id)}
                  data-testid={`delete-banner-${banner.id}`}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && !loading && (
        <div className="text-center py-12 relative z-10">
          <div className="glass-card p-8 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <p className="text-yellow-400">No banners created yet</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
