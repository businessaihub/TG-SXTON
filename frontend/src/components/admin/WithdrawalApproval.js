import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../App";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const WithdrawalApproval = ({ adminToken, language = "en" }) => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const t = {
    en: {
      title: "Withdrawal Approvals",
      pending: "Pending Withdrawals",
      approved: "Approved",
      rejected: "Rejected", 
      user: "User",
      amount: "Amount",
      requested: "Requested",
      delay: "Processing Delay",
      status: "Status",
      actions: "Actions",
      approve: "Approve",
      reject: "Reject",
      notes: "Admin Notes",
      addNotes: "Add optional notes",
      confirm: "Confirm",
      cancel: "Cancel",
      noWithdrawals: "No pending withdrawals",
      approveConfirm: "Approve this withdrawal?",
      rejectConfirm: "Reject this withdrawal? Balance will be refunded.",
      success: "Success!",
      error: "Error",
      fee: "Fee (1%)"
    },
    ru: {
      title: "Одобрение выводов",
      pending: "Ожидающие выводы",
      approved: "Одобрено",
      rejected: "Отклонено",
      user: "Пользователь",
      amount: "Сумма",
      requested: "Запрошено",
      delay: "Задержка обработки",
      status: "Статус",
      actions: "Действия",
      approve: "Одобрить",
      reject: "Отклонить",
      notes: "Примечания админа",
      addNotes: "Добавить примечания",
      confirm: "Подтвердить",
      cancel: "Отмена",
      noWithdrawals: "Нет ожидающих выводов",
      approveConfirm: "Одобрить этот вывод?",
      rejectConfirm: "Отклонить этот вывод? Баланс будет возвращен.",
      success: "Успех!",
      error: "Ошибка",
      fee: "Комиссия (1%)"
    }
  };

  const labels = t[language] || t.en;

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/admin/pending-withdrawals`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setWithdrawals(res.data.withdrawals || []);
    } catch (err) {
      console.error("Error loading withdrawals:", err);
      toast.error(labels.error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId) => {
    if (!window.confirm(labels.approveConfirm)) return;

    try {
      setProcessing(true);
      await axios.post(
        `${API}/admin/withdrawals/${withdrawalId}/approve`,
        { admin_notes: adminNotes },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      setWithdrawals(prev =>
        prev.filter(w => w._id !== withdrawalId)
      );
      setSelectedWithdrawal(null);
      setAdminNotes("");
      toast.success("Withdrawal approved!");
    } catch (err) {
      toast.error(err.response?.data?.detail || labels.error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (withdrawalId) => {
    if (!window.confirm(labels.rejectConfirm)) return;

    try {
      setProcessing(true);
      await axios.post(
        `${API}/admin/withdrawals/${withdrawalId}/reject`,
        { admin_notes: adminNotes },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      setWithdrawals(prev =>
        prev.filter(w => w._id !== withdrawalId)
      );
      setSelectedWithdrawal(null);
      setAdminNotes("");
      toast.success("Withdrawal rejected!");
    } catch (err) {
      toast.error(err.response?.data?.detail || labels.error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400 mx-auto mb-3"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="text-orange-400" size={24} />
        <h1 className="text-3xl font-bold text-white">
          {labels.title}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-orange-500/10 border-orange-500/30 p-4">
          <div className="text-sm text-gray-400">{labels.pending}</div>
          <div className="text-2xl font-bold text-orange-400">{pendingWithdrawals.length}</div>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30 p-4">
          <div className="text-sm text-gray-400">{labels.approved}</div>
          <div className="text-2xl font-bold text-green-400">
            {withdrawals.filter(w => w.status === "approved").length}
          </div>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30 p-4">
          <div className="text-sm text-gray-400">{labels.rejected}</div>
          <div className="text-2xl font-bold text-red-400">
            {withdrawals.filter(w => w.status === "rejected").length}
          </div>
        </Card>
      </div>

      {/* Withdrawals List */}
      <div className="space-y-4">
        {pendingWithdrawals.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
            <CheckCircle className="text-green-400 mx-auto mb-3" size={32} />
            <p className="text-gray-400">{labels.noWithdrawals}</p>
          </Card>
        ) : (
          pendingWithdrawals.map((withdrawal) => (
            <Card
              key={withdrawal._id}
              className="bg-slate-800/50 border-orange-500/30 p-4 space-y-4"
            >
              <div className="grid grid-cols-6 gap-4 items-center text-sm">
                <div>
                  <div className="text-xs text-gray-500">{labels.user}</div>
                  <div className="font-semibold text-white">
                    {withdrawal.username}
                  </div>
                  <div className="text-xs text-gray-500">{withdrawal.telegram_id}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">{labels.amount}</div>
                  <div className="font-bold text-yellow-400 text-lg">
                    {(withdrawal.amount || 0).toFixed(2)} TON
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">{labels.fee}</div>
                  <div className="text-red-400 font-semibold">
                    -{(withdrawal.amount * 0.01).toFixed(2)} TON
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">{labels.delay}</div>
                  <div className="text-white font-semibold">
                    {withdrawal.processing_delay_hours}h
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500">{labels.requested}</div>
                  <div className="text-gray-300 text-xs">
                    {new Date(withdrawal.requested_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div>
                  <Badge className="bg-orange-500/30 text-orange-300">
                    {withdrawal.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Detailed View */}
              {selectedWithdrawal === withdrawal._id && (
                <div className="border-t border-slate-700 pt-4 space-y-4">
                  <div className="bg-slate-900/50 rounded p-3">
                    <label className="text-xs text-gray-400 block mb-2">
                      {labels.notes}
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={labels.addNotes}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400"
                      rows="2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => handleApprove(withdrawal._id)}
                      disabled={processing}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle size={16} className="mr-1" />
                      {labels.approve}
                    </Button>
                    <Button
                      onClick={() => handleReject(withdrawal._id)}
                      disabled={processing}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      <XCircle size={16} className="mr-1" />
                      {labels.reject}
                    </Button>
                    <Button
                      onClick={() => setSelectedWithdrawal(null)}
                      variant="outline"
                    >
                      {labels.cancel}
                    </Button>
                  </div>
                </div>
              )}

              {/* Expand Button */}
              {selectedWithdrawal !== withdrawal._id && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => setSelectedWithdrawal(withdrawal._id)}
                    size="sm"
                    variant="outline"
                    className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    Review
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WithdrawalApproval;
