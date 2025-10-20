import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = ({ setIsAdmin, setAdminToken }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/admin/login`, {
        username,
        password
      });
      
      if (response.data.success) {
        const token = response.data.token;
        localStorage.setItem("admin_token", token);
        setAdminToken(token);
        setIsAdmin(true);
        toast.success("Login successful!");
        navigate("/admin/dashboard");
      }
    } catch (error) {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold neon-cyan mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Admin Login
          </h1>
          <p className="text-gray-400">StickersXTon Dashboard</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <User size={16} />
              Username
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="admin-username-input"
              className="bg-white/5 border-white/10 text-white"
              placeholder="Enter username"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Lock size={16} />
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-password-input"
              className="bg-white/5 border-white/10 text-white"
              placeholder="Enter password"
              required
            />
          </div>
          
          <Button
            type="submit"
            data-testid="admin-login-btn"
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Default: admin / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;