import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const QuestManagement = () => {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    quest_type: "link",
    target_url: "",
    target_channel: "",
    reward_type: "SXTON",
    reward_amount: 100,
    is_active: true,
    is_daily: false,
    required_referrals: 0,
    expires_at: ""
  });

  useEffect(() => {
    fetchQuests();
  }, []);

  const fetchQuests = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await axios.get(`${API}/admin/quests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuests(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching quests:", error);
      setLoading(false);
    }
  };

  const handleOpenDialog = (quest = null) => {
    if (quest) {
      setEditingQuest(quest);
      setFormData(quest);
    } else {
      setEditingQuest(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      quest_type: "link",
      target_url: "",
      target_channel: "",
      reward_type: "SXTON",
      reward_amount: 100,
      is_active: true,
      is_daily: false,
      required_referrals: 0,
      expires_at: ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");

    if (!formData.title || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingQuest) {
        await axios.put(`${API}/admin/quests/${editingQuest.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Quest updated successfully");
      } else {
        await axios.post(`${API}/admin/quests`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Quest created successfully");
      }
      setIsDialogOpen(false);
      fetchQuests();
    } catch (error) {
      toast.error("Error saving quest");
      console.error(error);
    }
  };

  const handleDelete = async (questId) => {
    if (!window.confirm("Are you sure you want to delete this quest?")) return;

    const token = localStorage.getItem("admin_token");
    try {
      await axios.delete(`${API}/admin/quests/${questId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Quest deleted successfully");
      fetchQuests();
    } catch (error) {
      toast.error("Error deleting quest");
    }
  };

  const handleToggleActive = async (quest) => {
    const token = localStorage.getItem("admin_token");
    try {
      await axios.put(
        `${API}/admin/quests/${quest.id}`,
        { ...quest, is_active: !quest.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuests();
    } catch (error) {
      toast.error("Error updating quest");
    }
  };

  const getRewardColor = (type) => {
    switch (type) {
      case "SXTON": return "bg-purple-500/20 text-purple-400";
      case "Stars": return "bg-yellow-500/20 text-yellow-400";
      case "TON": return "bg-cyan-500/20 text-cyan-400";
      case "Points": return "bg-pink-500/20 text-pink-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getQuestTypeLabel = (type) => {
    switch (type) {
      case "link": return "📎 Follow Link";
      case "referral": return "👥 Referral";
      case "join_chat": return "💬 Join Chat";
      case "on_chain": return "⛓️ On-chain";
      case "follow": return "📱 Follow Channel";
      case "purchase": return "🛒 Purchase";
      default: return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading quests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Quest Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Plus size={16} className="mr-2" />
              New Quest
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border border-purple-500/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingQuest ? "Edit Quest" : "Create New Quest"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Title *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Quest title"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Description *</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Quest description"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Quest Type</label>
                <Select value={formData.quest_type} onValueChange={(value) => setFormData({ ...formData, quest_type: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="link">Follow Link</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="join_chat">Join Chat</SelectItem>
                    <SelectItem value="on_chain">On-chain Action</SelectItem>
                    <SelectItem value="follow">Follow Channel</SelectItem>
                    <SelectItem value="purchase">Purchase Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.quest_type === "link" && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Target URL</label>
                  <Input
                    value={formData.target_url}
                    onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              {formData.quest_type === "referral" && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Required Referrals</label>
                  <Input
                    type="number"
                    value={formData.required_referrals}
                    onChange={(e) => setFormData({ ...formData, required_referrals: parseInt(e.target.value) })}
                    min="1"
                    placeholder="e.g., 3, 5, 10"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              {formData.quest_type === "join_chat" && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Chat/Channel Link</label>
                  <Input
                    value={formData.target_url}
                    onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                    placeholder="https://t.me/..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              {formData.quest_type === "on_chain" && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">On-chain Action Details</label>
                  <Input
                    value={formData.target_url}
                    onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                    placeholder="e.g., Bridge to TON, Stake tokens, etc."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              {formData.quest_type === "follow" && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Channel Name</label>
                  <Input
                    value={formData.target_channel}
                    onChange={(e) => setFormData({ ...formData, target_channel: e.target.value })}
                    placeholder="@channel_name"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Reward Type</label>
                  <Select value={formData.reward_type} onValueChange={(value) => setFormData({ ...formData, reward_type: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="SXTON">SXTON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Reward Amount</label>
                  <Input
                    type="number"
                    value={formData.reward_amount}
                    onChange={(e) => setFormData({ ...formData, reward_amount: parseFloat(e.target.value.replace(',', '.')) })}
                    min="0"
                    step="0.1"
                    placeholder="e.g., 1.5, 10.5, 100"
                    className="bg-slate-800 border-slate-700 text-white"
                    lang="en"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={formData.is_daily}
                    onChange={(e) => setFormData({ ...formData, is_daily: e.target.checked })}
                    className="rounded"
                  />
                  Daily Quest
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  Active
                </label>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Expires At (Optional)</label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                >
                  {editingQuest ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quests List */}
      <div className="grid gap-3">
        {quests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No quests yet. Create one to get started!</div>
        ) : (
          quests.map((quest) => (
            <div
              key={quest.id}
              className="glass-card p-4 border border-white/10 relative overflow-hidden"
            >
              <div className="cosmic-particles"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{quest.title}</h3>
                      {quest.is_daily && (
                        <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                          Daily
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{quest.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(quest)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(quest.id)}
                      className="text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
                  <div className="flex gap-2">
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                      {getQuestTypeLabel(quest.quest_type)}
                    </Badge>
                    <Badge className={`text-xs ${getRewardColor(quest.reward_type)}`}>
                      {quest.reward_amount} {quest.reward_type}
                    </Badge>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleToggleActive(quest)}
                    className={quest.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                  >
                    <CheckCircle size={14} className="mr-1" />
                    {quest.is_active ? "Active" : "Inactive"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestManagement;
