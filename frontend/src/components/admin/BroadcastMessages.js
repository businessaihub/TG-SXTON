import { useState } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { MessageSquare, Send, Users } from "lucide-react";
import { toast } from "sonner";

const BroadcastMessages = ({ adminToken, users = [] }) => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [targetUsers, setTargetUsers] = useState("all");
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState([
    {
      id: "msg_1",
      subject: "Welcome to SXTON",
      message: "Thanks for joining!",
      recipientCount: 142,
      sent_at: new Date(Date.now() - 86400000).toISOString()
    }
  ]);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    setSending(true);
    try {
      // Simulate sending broadcast
      const newMsg = {
        id: `msg_${Date.now()}`,
        subject,
        message,
        recipientCount: users.length,
        sent_at: new Date().toISOString()
      };

      setSentMessages([newMsg, ...sentMessages]);
      setSubject("");
      setMessage("");
      toast.success(`Message sent to ${users.length} users!`);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <MessageSquare size={24} className="text-blue-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          Broadcast Messages
        </h2>
      </div>

      {/* Compose Message */}
      <div className="glass-card p-6 border border-blue-500/20 space-y-4">
        <h3 className="text-lg font-semibold text-white">Compose New Message</h3>

        <div>
          <label className="text-sm text-gray-400 block mb-2">Subject</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Message subject..."
            className="bg-slate-800/50 border-white/10 text-white placeholder-gray-500"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">{subject.length}/100</p>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-2">Message Body</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your broadcast message..."
            className="bg-slate-800/50 border-white/10 text-white placeholder-gray-500 min-h-32 resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/1000</p>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-2">Target Audience</label>
          <div className="flex gap-2">
            {["all", "active", "vip"].map((opt) => (
              <Button
                key={opt}
                onClick={() => setTargetUsers(opt)}
                className={`h-8 px-3 text-sm capitalize ${
                  targetUsers === opt
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800/50 text-gray-400 hover:bg-slate-700/50"
                }`}
              >
                {opt === "all" ? "All Users" : opt === "active" ? "Active Only" : "VIP Only"}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-gray-400">
            Recipients: <span className="text-cyan-400 font-semibold">{users.length}</span>
          </span>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white h-9 px-4"
          >
            <Send size={16} className="mr-2" />
            {sending ? "Sending..." : "Send Broadcast"}
          </Button>
        </div>
      </div>

      {/* Sent Messages History */}
      <div className="glass-card p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Broadcasts</h3>

        <div className="space-y-3">
          {sentMessages.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No messages sent yet</p>
          ) : (
            sentMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded bg-slate-800/30 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white">{msg.subject}</h4>
                    <p className="text-sm text-gray-400 line-clamp-1">{msg.message}</p>
                  </div>
                  <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs shrink-0">
                    <Users size={12} className="mr-1" />
                    {msg.recipientCount}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Sent {new Date(msg.sent_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastMessages;
