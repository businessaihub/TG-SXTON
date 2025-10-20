import { useState } from "react";
import axios from "axios";
import { API } from "../../App";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Play, BarChart } from "lucide-react";
import { toast } from "sonner";

const ActivitySimulation = () => {
  const [count, setCount] = useState(50);
  const [simulating, setSimulating] = useState(false);

  const handleSimulate = async () => {
    setSimulating(true);
    const token = localStorage.getItem("admin_token");
    
    try {
      await axios.post(`${API}/admin/simulate-activity`, { count }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Simulated ${count} activity events`);
    } catch (error) {
      toast.error("Error simulating activity");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-simulation">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Activity Simulation
        </h2>
        <p className="text-gray-400">Generate simulated activity for testing</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Number of Events to Simulate</label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="bg-white/5 border-white/10 text-white"
              min="1"
              max="1000"
            />
          </div>

          <Button
            onClick={handleSimulate}
            disabled={simulating}
            data-testid="simulate-activity-btn"
            className="w-full bg-purple-500 hover:bg-purple-600"
          >
            {simulating ? (
              <>
                <BarChart className="mr-2 animate-pulse" size={18} />
                Simulating...
              </>
            ) : (
              <>
                <Play className="mr-2" size={18} />
                Run Simulation
              </>
            )}
          </Button>
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="text-lg font-semibold text-white mb-3">Simulation Info</h3>
          <div className="text-sm text-gray-400 space-y-2">
            <p>• Simulated events are marked and visible in the activity feed</p>
            <p>• Events include: bought, opened, listed, sold actions</p>
            <p>• Prices are randomly generated within realistic ranges</p>
            <p>• Use this to preview how the platform looks with activity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitySimulation;