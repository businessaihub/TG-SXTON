import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import MiniApp from "./pages/MiniApp";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import { TonConnectProvider } from "./context/TonConnectContext";
import { Toaster } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem("admin_token") || "");

  // Setup axios interceptor for auth token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("admin_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  // Handle token changes and validate on mount
  useEffect(() => {
    if (adminToken) {
      setIsAdmin(true);
      // Validate token with backend
      axios.post(`${API}/admin/verify-token`)
        .catch(() => {
          localStorage.removeItem("admin_token");
          setAdminToken("");
          setIsAdmin(false);
        });
    }
  }, [adminToken]);

  return (
    <div className="App">
      <TonConnectProvider>
        <BrowserRouter>
          <Routes>
            {/* Mini App Routes */}
            <Route path="/" element={<MiniApp isAdmin={isAdmin} />} />
            <Route path="/marketplace" element={<MiniApp isAdmin={isAdmin} />} />
            <Route path="/activity" element={<MiniApp isAdmin={isAdmin} />} />
            <Route path="/hot" element={<MiniApp isAdmin={isAdmin} />} />
            <Route path="/game" element={<MiniApp isAdmin={isAdmin} />} />
            <Route path="/profile" element={<MiniApp isAdmin={isAdmin} />} />
            <Route path="/quests" element={<MiniApp isAdmin={isAdmin} />} />
            {/* <Route path="/roulette" element={<MiniApp isAdmin={isAdmin} />} /> TODO: Enable when roulette is ready */}
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin setIsAdmin={setIsAdmin} setAdminToken={setAdminToken} />} />
            <Route 
              path="/admin/*" 
              element={isAdmin ? <AdminDashboard setIsAdmin={setIsAdmin} /> : <Navigate to="/admin/login" />} 
            />
          </Routes>
        </BrowserRouter>
      </TonConnectProvider>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;