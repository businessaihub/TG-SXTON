import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus, Edit, Trash2, Activity } from "lucide-react";
import { toast } from "sonner";

const ActivityManagement = () => {
  const [activities, setActivities] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  
  // Filters
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    pack_name: "",
    action: "bought",
    price: 0,
    price_type: "TON",
    is_free: false,
    is_simulation: true
  });

  useEffect(() => {
    fetchActivities();
    fetchPacks();
  }, [collectionFilter, actionFilter, timeFilter]);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/activity`);
      setActivities(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setLoading(false);
    }
  };

  const fetchPacks = async () => {
    try {
      const response = await axios.get(`${API}/packs`);
      setPacks(response.data);
    } catch (error) {
      console.error("Error fetching packs:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    
    try {
      if (editingActivity) {
        await axios.put(`${API}/admin/activity/${editingActivity.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Activity updated successfully");
      } else {
        await axios.post(`${API}/admin/activity`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Activity created successfully");
      }
      setIsDialogOpen(false);
      setEditingActivity(null);
      resetForm();
      fetchActivities();
    } catch (error) {
      toast.error("Error saving activity");
    }
  };

  const handleDelete = async (activityId) => {
    if (!window.confirm("Are you sure you want to delete this activity?")) return;
    
    const token = localStorage.getItem("admin_token");
    try {
      await axios.delete(`${API}/admin/activity/${activityId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Activity deleted successfully");
      fetchActivities();
    } catch (error) {
      toast.error("Error deleting activity");
    }
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setFormData({
      pack_name: activity.pack_name,
      action: activity.action,
      price: activity.price,
      price_type: activity.price_type,
      is_free: activity.is_free,
      is_simulation: activity.is_simulation
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      pack_name: "",
      action: "bought",
      price: 0,
      price_type: "TON",
      is_free: false,
      is_simulation: true
    });
  };

  const getActionColor = (action) => {
    switch (action) {
      case "bought": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "opened": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "burned": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "listed": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "sold": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="space-y-6 relative" data-testid="admin-activity-management">
      <div className="cosmic-bg"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Activity Management
          </h2>
          <p className="text-gray-400">Create and manage marketplace activity for demo</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingActivity(null);
                resetForm();
              }}
              data-testid="create-activity-btn"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} className="mr-2" />
              Create Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingActivity ? "Edit Activity" : "Create New Activity"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Collection Name</label>
                <Select 
                  value={formData.pack_name} 
                  onValueChange={(v) => setFormData({...formData, pack_name: v})}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10">
                    {packs.map((pack) => (
                      <SelectItem key={pack.id} value={pack.name}>{pack.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Action Type</label>
                  <Select value={formData.action} onValueChange={(v) => setFormData({...formData, action: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10">
                      <SelectItem value="bought">Bought</SelectItem>
                      <SelectItem value="opened">Opened</SelectItem>
                      <SelectItem value="listed">Listed</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="burned">Burned</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_free}
                    onChange={(e) => setFormData({...formData, is_free: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-400">Free Activity</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_simulation}
                    onChange={(e) => setFormData({...formData, is_simulation: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-400">Mark as Demo</span>
                </label>
              </div>
              
              <Button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                {editingActivity ? "Update Activity" : "Create Activity"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Activities List */}
      <div className="space-y-3 relative z-10">
        {activities.slice(0, 20).map((activity) => (
          <div key={activity.id} className="glass-card p-4 relative overflow-hidden" data-testid={`admin-activity-${activity.id}`}>
            <div className="cosmic-particles"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-white">{activity.pack_name}</span>
                  <Badge className={getActionColor(activity.action)}>
                    {activity.action}
                  </Badge>
                  {activity.is_simulation && (
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs border-purple-500/30">
                      Demo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-cyan-400 font-semibold">
                    {activity.price} {activity.price_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(activity)}
                  data-testid={`edit-activity-${activity.id}`}
                >
                  <Edit size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(activity.id)}
                  data-testid={`delete-activity-${activity.id}`}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && !loading && (
        <div className="text-center py-12 relative z-10">
          <div className="glass-card p-8 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
            <p className="text-yellow-400">No activities yet</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityManagement;