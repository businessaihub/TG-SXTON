import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import MiniApp from "./pages/MiniApp";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem("admin_token") || "");

  useEffect(() => {
    if (adminToken) {
      setIsAdmin(true);
    }
  }, [adminToken]);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Mini App Routes */}
          <Route path="/" element={<MiniApp isAdmin={isAdmin} />} />
          <Route path="/marketplace" element={<MiniApp isAdmin={isAdmin} />} />
          <Route path="/activity" element={<MiniApp isAdmin={isAdmin} />} />
          <Route path="/hot" element={<MiniApp isAdmin={isAdmin} />} />
          <Route path="/profile" element={<MiniApp isAdmin={isAdmin} />} />
          {/* <Route path="/roulette" element={<MiniApp isAdmin={isAdmin} />} /> TODO: Enable when roulette is ready */}
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin setIsAdmin={setIsAdmin} setAdminToken={setAdminToken} />} />
          <Route 
            path="/admin/*" 
            element={isAdmin ? <AdminDashboard setIsAdmin={setIsAdmin} /> : <Navigate to="/admin/login" />} 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;