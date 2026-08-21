import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveService } from '../../services/api';
import { TeamMember } from '../../types';
import { useToast } from '../../context/ToastContext';

interface MarkLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

export default function MarkLeaveModal({ isOpen, onClose, member }: MarkLeaveModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const getTodayStr = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      const today = getTodayStr();
      setStartDate(today);
      setEndDate(today);
      setReason('');
    }
  }, [isOpen, member]);

  const markLeaveMutation = useMutation({
    mutationFn: leaveService.markLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast(`Leave recorded for ${member?.name}!`, 'success');
      onClose();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || err.message || 'Failed to mark leave', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    if (startDate > endDate) {
      showToast('Start date cannot be after end date', 'error');
      return;
    }

    markLeaveMutation.mutate({
      username: member.username,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || undefined,
    });
  };

  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-on-surface">Mark Member Leave</h3>
                <p className="text-on-surface-variant text-[11px] font-semibold opacity-70">
                  {member.name} ({member.username})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">
                  From Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-medium text-on-surface"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">
                  To Date
                </label>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-medium text-on-surface"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">
                Reason / Note (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Planned Time Off / Sick Leave"
                rows={3}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-medium text-on-surface resize-none"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Note:</strong> While on leave, this member will be excluded from the 5:00 PM available bandwidth alerts, and their profile editing will be temporarily locked.
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={markLeaveMutation.isPending}
                className="px-5 py-2 primary-gradient text-on-primary rounded-xl text-xs font-bold tracking-wide transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {markLeaveMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Confirm Leave</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
