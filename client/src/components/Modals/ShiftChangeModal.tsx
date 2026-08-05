import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Hash, AtSign, Loader2, CheckCircle2, AlertCircle as AlertIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftService, teamService } from '../../services/api';
import { ShiftLog, ShiftLogCreate, TeamMember } from '../../types';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface ShiftChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ShiftLog | null;
}

export default function ShiftChangeModal({ isOpen, onClose, initialData }: ShiftChangeModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: userDetail } = useQuery({
    queryKey: ['user-detail'],
    queryFn: () => teamService.getUserDetail(),
    enabled: isOpen,
  });

  const [formData, setFormData] = useState<ShiftLogCreate>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    actual_shift: '',
    worked_shift: '',
    project: '',
    reason: '',
    lead_approval: '',
    hr_verification: '',
    manager_approval: '',
    manager_remarks: '',
    lead_hr_comments: '',
  });

  useEffect(() => {
    if (initialData) {
      // Handle date format conversion if needed (e.g., "13/4/2026" to "2026-04-13")
      let formattedDate = initialData.date || '';
      if (formattedDate.includes('/')) {
        const [day, month, year] = formattedDate.split('/');
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      setFormData({
        name: initialData.name || '',
        date: formattedDate,
        actual_shift: initialData.actual_shift || '',
        worked_shift: initialData.worked_shift || '',
        project: initialData.project || '',
        reason: initialData.reason || '',
        lead_approval: initialData.lead_approval || '',
        hr_verification: initialData.hr_verification || '',
        manager_approval: initialData.manager_approval || '',
        manager_remarks: initialData.manager_remarks || '',
        lead_hr_comments: initialData.lead_hr_comments || '',
      });
    } else {
      // Auto-fill from current user details if available
      const shftFiller = userDetail?.shift_start && userDetail?.shift_end 
          ? `${convertTo12h(userDetail.shift_start)} - ${convertTo12h(userDetail.shift_end)}`
          : ''
      setFormData({
        name: userDetail?.name || '',
        date: new Date().toISOString().split('T')[0],
        actual_shift: shftFiller,
        worked_shift: shftFiller,
        project: '',
        reason: '',
        lead_approval: '',
        hr_verification: '',
        manager_approval: '',
        manager_remarks: '',
        lead_hr_comments: '',
      });
    }
  }, [initialData, isOpen, userDetail]);

  const convertTo12h = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    const mStr = m === 0 ? '' : `:${minutes.padStart(2, '0')}`;
    return `${h12}${mStr}${ampm}`;
  };

  const mutation = useMutation({
    mutationFn: (data: ShiftLogCreate) => 
      initialData 
        ? shiftService.updateShift(initialData.name, initialData.date, data)
        : shiftService.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      showToast(initialData ? 'Shift updated successfully!' : 'Shift logged successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || 'An error occurred';
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
        showToast('A shift log for this member and date already exists.', 'duplicate');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert date back to D/M/YYYY for API
    let apiDate = formData.date;
    if (apiDate.includes('-')) {
      const [year, month, day] = apiDate.split('-');
      apiDate = `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
    }

    mutation.mutate({ 
      ...formData, 
      date: apiDate,
      actual_shift: formData.actual_shift.toLowerCase(),
      worked_shift: formData.worked_shift.toLowerCase(),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-on-surface">
                  {initialData ? 'Edit Shift Change' : 'Log Shift Change'}
                </h3>
                <p className="text-on-surface-variant text-sm font-medium mt-1">
                  {initialData ? 'Update the shift exception details.' : 'Record a shift exception for a team member.'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Employee Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
                    <input 
                      type="text"
                      readOnly
                      value={formData.name}
                      className="w-full bg-surface-container-low/30 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none font-medium text-on-surface-variant/60 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Date of Change</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="date" 
                      required
                      disabled={!!initialData}
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Project</label>
                  <div className="relative group">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      required
                      placeholder="Project Name"
                      value={formData.project}
                      onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Reason</label>
                  <div className="relative group">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      required
                      placeholder="Reason for change"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Actual Shift (Standard)</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 4pm - 1am"
                      value={formData.actual_shift}
                      onChange={(e) => setFormData({ ...formData, actual_shift: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Worked Shift (Exception)</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-secondary transition-colors" size={18} />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 4:30pm - 1:30am"
                      value={formData.worked_shift}
                      onChange={(e) => setFormData({ ...formData, worked_shift: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-secondary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-outline-variant/5">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={mutation.isPending}
                  className="primary-gradient text-on-primary px-10 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center gap-2"
                >
                  {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
                  <span>{mutation.isPending ? 'Saving...' : 'Save Change'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
