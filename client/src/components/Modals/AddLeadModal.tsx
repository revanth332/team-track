import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddLeadModal({ isOpen, onClose }: AddLeadModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedUsername, setSelectedUsername] = useState('');

  const { data: availableLeads, isLoading } = useQuery({
    queryKey: ['unassigned-leads'],
    queryFn: () => teamService.getUnassignedUsers({ position: 'lead' }),
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: () => teamService.assignLead(selectedUsername, user?.username || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', 'my-team'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Lead assigned successfully', 'success');
      onClose();
      setSelectedUsername('');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to assign lead', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsername) return;
    assignMutation.mutate();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-container-high rounded-[2.5rem] shadow-2xl shadow-primary/10 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-on-surface tracking-tight">Add Leads</h2>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Assign available leads to your team</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Select Lead</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <select 
                      required
                      value={selectedUsername}
                      onChange={(e) => setSelectedUsername(e.target.value)}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium appearance-none"
                    >
                      <option value="">Choose a lead...</option>
                      {availableLeads?.map(lead => (
                        <option key={lead.username} value={lead.username}>
                          {lead.name} ({lead.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  {availableLeads?.length === 0 && !isLoading && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-2xl flex gap-3 text-amber-700">
                      <AlertCircle size={18} className="shrink-0" />
                      <p className="text-xs font-medium">No available leads found without an assigned manager.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3.5 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-highest rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedUsername || assignMutation.isPending}
                    className="flex-1 px-6 py-3.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    {assignMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                    ) : (
                      'Confirm Assignment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
