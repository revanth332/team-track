import React, { useState } from 'react';
import { Plus, ArrowRight, Edit2, Search, Loader2, AlertCircle, Clock, Calendar, MoreVertical, Trash2, FileText, MessageSquare, Pencil, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilter } from '../context/FilterContext';
import { shiftService, teamService } from '../services/api';
import { ShiftLog, TeamMember } from '../types';
import ShiftChangeModal from './Modals/ShiftChangeModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import { useDebounce } from '../hooks/useDebounce';
import { getProfileImage } from '../utils/userUtils';
import { TableSkeleton } from './ui/Skeleton';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ShiftLogs({ onNavigateToProfile }: { onNavigateToProfile?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { selectedAssignee } = useFilter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftLog | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<ShiftLog | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingCommentsId, setEditingCommentsId] = useState<string | null>(null);
  const [tempComments, setTempComments] = useState<string>('');
  const [filters, setFilters] = useState({
    name: '',
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    status: '',
  });

  const activeName = selectedAssignee?.name || filters.name;
  const debouncedName = useDebounce(activeName, 500);

  const { data: shifts, isLoading, isError, error } = useQuery({
    queryKey: ['shifts', { ...filters, name: debouncedName }],
    queryFn: () => shiftService.getShifts({ ...filters, name: debouncedName }),
    retry: false
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => teamService.getMembers(),
  });

  const getUsernameByEmpname = (name: string) => {
    const member = members?.find(m => String(m.name) === String(name));
    return member?.username;
  };

  const updateMutation = useMutation({
    mutationFn: ({ name, date, data }: { name: string, date: string, data: Partial<ShiftLog> }) => 
      shiftService.updateShift(name, date, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      showToast('Shift log updated successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update shift log', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ name, date }: { name: string, date: string }) => 
      shiftService.deleteShift(name, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      showToast('Shift log deleted successfully!', 'success');
      setIsDeleteModalOpen(false);
      setShiftToDelete(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete shift log', 'error');
    }
  });

  const handleApproval = (change: ShiftLog, status: string) => {
    const field = user?.position === 'lead' ? 'lead_approval' : 'manager_approval';
    updateMutation.mutate({ 
      name: change.name, 
      date: change.date, 
      data: { 
        ...change, 
        [field]: status,
      } 
    });
  };

  const handleCommentsUpdate = (change: ShiftLog) => {
    const trimmedComments = tempComments.trim();
    if (trimmedComments === (change.lead_hr_comments || "")) {
      setEditingCommentsId(null);
      return;
    }
    
    updateMutation.mutate({
      name: change.name,
      date: change.date,
      data: {
        ...change,
        lead_hr_comments: trimmedComments
      }
    });
    setEditingCommentsId(null);
  };

  const handleEdit = (shift: ShiftLog) => {
    setSelectedShift(shift);
    setIsModalOpen(true);
  };

  const handleDelete = (shift: ShiftLog) => {
    setShiftToDelete(shift);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (shiftToDelete) {
      deleteMutation.mutate({ name: shiftToDelete.name, date: shiftToDelete.date });
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const formatDate = (dateValue: any) => {
    if (!dateValue) return { month: '---', day: '--' };
    
    let dateStr = '';
    let date: Date | null = null;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      dateStr = dateValue;
    } else if (dateValue && typeof dateValue.toString === 'function') {
      dateStr = dateValue.toString();
    }

    if (!date && dateStr) {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts.map(Number);
          date = new Date(year, month - 1, day);
        }
      } else if (dateStr.includes('-')) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr);
      }
    }

    if (!date || isNaN(date.getTime())) {
      return { month: '---', day: '--' };
    }

    return {
      month: date.toLocaleString('default', { month: 'short' }),
      day: date.getDate(),
    };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-5">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Shift Delays & Changes</h2>
          <p className="text-on-surface-variant mt-1 font-medium">Review and manage team schedule exceptions for the current quarter.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="primary-gradient text-on-primary px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Log Shift Change</span>
        </button>
      </section>

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low/30 p-6 rounded-3xl border border-outline-variant/5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:col-span-2 gap-4 flex-1">
          <select 
            value={filters.month}
            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            className="w-full bg-white border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium appearance-none"
          >
            <option value="">All Months</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select 
            value={filters.year}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="w-full bg-white border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium appearance-none"
          >
            <option value="">All Years</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select 
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full bg-white border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium appearance-none sm:col-span-1 col-span-2"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </section>

      <div className="flex items-center px-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/5 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
          <span>{shifts?.length || 0} Shift Logs Found</span>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6 bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20">
          {(error as any)?.response?.status === 400 ? (
            <>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-2">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-on-surface font-bold text-lg">No sheet found</p>
                <p className="text-on-surface-variant text-sm max-w-xs mx-auto">We couldn't locate the shift log sheet for your account.</p>
              </div>
              {user?.position === 'lead' && (
                <button 
                  onClick={onNavigateToProfile}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
                >
                  <FileSpreadsheet size={18} />
                  <span>Provide sheet Name</span>
                </button>
              )}
            </>
          ) : (
            <>
              <AlertCircle size={40} className="text-error" />
              <p className="font-medium text-error text-center px-4">
                {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load shift logs. Please try again later.'}
              </p>
            </>
          )}
        </div>
      ) : shifts?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20">
          <Clock size={48} className="text-on-surface-variant/20" />
          <p className="text-on-surface-variant font-medium">No shift exceptions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shifts?.map((change, index) => {
            const { month, day } = formatDate(change.date);
            
            return (
              <motion.div
                key={`${change.id}-${change.name}-${change.date}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-surface-container-lowest p-5 rounded-3xl flex flex-col gap-4 group hover:shadow-md transition-all border border-outline-variant/5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                    {/* Date Box */}
                    <div className="flex flex-col items-center justify-center bg-surface-container-low w-16 h-16 rounded-2xl text-primary shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{month}</span>
                      <span className="text-2xl font-extrabold leading-none">{day}</span>
                    </div>

                    {/* User Identity */}
                    <div className="flex items-center gap-4 sm:border-r border-outline-variant/10 sm:pr-10">
                      <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold shadow-sm overflow-hidden relative">
                        {getUsernameByEmpname(change.name) ? (
                          <img 
                            src={getProfileImage(getUsernameByEmpname(change.name)!)} 
                            alt={change.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="absolute inset-0 flex items-center justify-center -z-10">
                          {change.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface text-sm">{change.name || 'Unknown'}</h4>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">{change.project}</p>
                      </div>
                    </div>

                    {/* Shift Change Details */}
                    <div className="flex items-center gap-6 sm:border-r border-outline-variant/10 sm:pr-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Actual</span>
                        <span className="text-xs font-bold text-on-surface-variant/40">{change.actual_shift}</span>
                      </div>
                      <ArrowRight size={16} className="text-primary/20 mt-3" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Worked</span>
                        <span className="text-xs font-extrabold text-on-surface">{change.worked_shift}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0">
                    <div className="flex flex-col items-start lg:items-end gap-1">
                      <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Lead</span>
                      {!change.lead_approval || change.lead_approval?.trim() === "" ? (
                        user?.position === 'lead' ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleApproval(change, 'Approved')}
                              disabled={updateMutation.isPending}
                              className="px-2 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-green-600 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApproval(change, 'Rejected')}
                              disabled={updateMutation.isPending}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        )
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          change.lead_approval?.trim() === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {change.lead_approval}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-start lg:items-end gap-1">
                      <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Manager</span>
                      {!change.manager_approval || change.manager_approval?.trim() === "" ? (
                        user?.position === 'manager' ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleApproval(change, 'Approved')}
                              disabled={updateMutation.isPending}
                              className="px-2 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-green-600 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApproval(change, 'Rejected')}
                              disabled={updateMutation.isPending}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700`}>
                            Pending
                          </span>
                        )
                      ) : (
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          change.manager_approval?.trim() === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {change.manager_approval}
                        </span>
                      )}
                    </div>
                    {(user.admin || (change.name === user.name && change.lead_approval?.trim() === '' && change.manager_approval?.trim() === '')) && (
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === change.id ? null : change.id)}
                          className="p-2 text-on-surface-variant/30 hover:text-primary transition-colors sm:ml-4 rounded-xl hover:bg-surface-container"
                        >
                          <MoreVertical size={18} />
                        </button>
                        <AnimatePresence>
                          {activeMenuId === change.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setActiveMenuId(null)} 
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-xl border border-outline-variant/5 py-2 z-50"
                              >
                              {change.name === user.name && (
                                <button 
                                  onClick={() => {
                                    handleEdit(change);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-on-surface-variant hover:bg-surface-container-low flex items-center gap-2 transition-colors"
                                >
                                  <Edit2 size={14} />
                                  Update
                                </button>
                              )}
                              {user.admin && (
                                <button 
                                  onClick={() => {
                                    handleDelete(change);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-bold text-error hover:bg-error/5 flex items-center gap-2 transition-colors"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-outline-variant/10">
                  <div className="bg-surface-container/40 rounded-2xl p-4 border border-outline-variant/5 hover:bg-surface-container/60 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-secondary" />
                      <span className="text-[10px] font-extrabold text-on-surface-variant/60 uppercase tracking-widest">Reason for Change</span>
                    </div>
                    <p className={`text-sm font-semibold leading-relaxed ${change.reason ? 'text-on-surface' : 'text-on-surface-variant/50 italic'}`}>
                      {change.reason || 'No reason provided'}
                    </p>
                  </div>

                  <div className="bg-surface-container/40 rounded-2xl p-4 border border-outline-variant/5 hover:bg-surface-container/60 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-primary" />
                        <span className="text-[10px] font-extrabold text-on-surface-variant/60 uppercase tracking-widest">Lead/HR Remarks</span>
                      </div>
                      {user?.admin && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCommentsId(change.id);
                            setTempComments(change.lead_hr_comments || '');
                          }}
                          className="p-1 hover:bg-surface-container rounded-md transition-colors text-primary"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                    {editingCommentsId === change.id ? (
                      <textarea
                        autoFocus
                        value={tempComments}
                        onChange={(e) => setTempComments(e.target.value)}
                        onBlur={() => handleCommentsUpdate(change)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCommentsUpdate(change);
                          }
                          if (e.key === 'Escape') setEditingCommentsId(null);
                        }}
                        className="w-full bg-white border border-primary/20 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-primary/10 outline-none resize-none"
                        rows={2}
                      />
                    ) : (
                      <p className={`text-sm font-semibold leading-relaxed ${change.lead_hr_comments ? 'text-on-surface' : 'text-on-surface-variant/50 italic'}`}>
                        {change.lead_hr_comments || "No remarks provided"}
                      </p>
                    )}
                  </div>

                  <div className="bg-surface-container/40 rounded-2xl p-4 border border-outline-variant/5 hover:bg-surface-container/60 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={14} className="text-amber-600" />
                      <span className="text-[10px] font-extrabold text-on-surface-variant/60 uppercase tracking-widest">Manager Remarks</span>
                    </div>
                    <p className={`text-sm font-semibold leading-relaxed ${change.manager_remarks ? 'text-on-surface' : 'text-on-surface-variant/50 italic'}`}>
                      {change.manager_remarks || "No remarks provided"}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <ShiftChangeModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedShift(null);
        }} 
        initialData={selectedShift}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setShiftToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Shift Log"
        message={`Are you sure you want to delete the shift log for ${shiftToDelete?.name} on ${shiftToDelete?.date}? This action cannot be undone.`}
        confirmText="Delete Log"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
