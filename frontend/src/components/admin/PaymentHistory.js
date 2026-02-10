import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { CreditCard, Filter, Download } from "lucide-react";
import { toast } from "sonner";

const PaymentHistory = ({ adminToken }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Генеруємо тестові дані транзакцій
      const mockTransactions = [
        {
          id: "tx_1",
          user_id: "user_123",
          amount: 5.2,
          currency: "TON",
          type: "purchase",
          status: "completed",
          pack_name: "Summer Collection",
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: "tx_2",
          user_id: "user_456",
          amount: 100,
          currency: "SXTON",
          type: "reward",
          status: "completed",
          pack_name: "Quest Reward",
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: "tx_3",
          user_id: "user_789",
          amount: 2.1,
          currency: "TON",
          type: "refund",
          status: "completed",
          pack_name: "Winter Pack",
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: "tx_4",
          user_id: "user_321",
          amount: 50,
          currency: "STARS",
          type: "purchase",
          status: "pending",
          pack_name: "Premium Bundle",
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ];
      setTransactions(mockTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchType = filterType === "all" || tx.type === filterType;
    const matchStatus = filterStatus === "all" || tx.status === filterStatus;
    const matchSearch = searchQuery === "" || 
      tx.pack_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.user_id.includes(searchQuery);
    return matchType && matchStatus && matchSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-400";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "failed": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "purchase": return "text-cyan-400";
      case "reward": return "text-green-400";
      case "refund": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const handleExport = () => {
    const csv = [
      ["Date", "User ID", "Amount", "Currency", "Type", "Status", "Pack"],
      ...filteredTransactions.map(tx => [
        new Date(tx.created_at).toLocaleString(),
        tx.user_id,
        tx.amount,
        tx.currency,
        tx.type,
        tx.status,
        tx.pack_name
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    a.click();
    toast.success("Transaction history exported!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <CreditCard size={24} className="text-purple-400" />
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk" }}>
          Payment History
        </h2>
        <Button
          onClick={handleExport}
          className="ml-auto bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 h-8"
        >
          <Download size={16} className="mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Transaction Type</label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-slate-800/50 border-white/10 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="reward">Reward</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-slate-800/50 border-white/10 text-white h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Search</label>
          <Input
            placeholder="Search by user or pack..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-800/50 border-white/10 text-white placeholder-gray-500 h-8 text-sm"
          />
        </div>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading transactions...</div>
      ) : (
        <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-slate-800/50">
                <th className="px-4 py-3 text-left text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-gray-400">User</th>
                <th className="px-4 py-3 text-right text-gray-400">Amount</th>
                <th className="px-4 py-3 text-left text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-gray-400">Pack</th>
                <th className="px-4 py-3 text-center text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs">{tx.user_id.slice(0, 10)}...</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">{tx.amount}</span>
                      <span className="text-gray-500 text-xs ml-1">{tx.currency}</span>
                    </td>
                    <td className={`px-4 py-3 font-semibold capitalize ${getTypeColor(tx.type)}`}>
                      {tx.type}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{tx.pack_name}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${getStatusColor(tx.status)} capitalize text-xs`}>
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-800/30 p-3 rounded border border-white/10 text-center">
          <p className="text-xs text-gray-400">Total Transactions</p>
          <p className="text-lg font-bold text-cyan-400">{filteredTransactions.length}</p>
        </div>
        <div className="bg-slate-800/30 p-3 rounded border border-white/10 text-center">
          <p className="text-xs text-gray-400">Completed</p>
          <p className="text-lg font-bold text-green-400">
            {filteredTransactions.filter(t => t.status === "completed").length}
          </p>
        </div>
        <div className="bg-slate-800/30 p-3 rounded border border-white/10 text-center">
          <p className="text-xs text-gray-400">Pending</p>
          <p className="text-lg font-bold text-yellow-400">
            {filteredTransactions.filter(t => t.status === "pending").length}
          </p>
        </div>
        <div className="bg-slate-800/30 p-3 rounded border border-white/10 text-center">
          <p className="text-xs text-gray-400">Total Volume</p>
          <p className="text-lg font-bold text-purple-400">
            {filteredTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
