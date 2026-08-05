import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  MoreVertical, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  UserPlus,
  Trash2,
  Key
} from 'lucide-react';
import { teamService, authService } from '../services/api';
import { TeamMember, Position } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/dateUtils';
import AddMemberModal from './Modals/AddMemberModal';
import AssignMembersModal from './Modals/AssignMembersModal';
import ConfirmationModal from './Modals/ConfirmationModal';

export default function PositionAssignment() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('All');
  const [page, setPage] = useState(1);
  const perPage = 5;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 450);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'info',
    onConfirm: () => {},
  });

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members', 'all', page, debouncedSearchTerm, positionFilter],
    queryFn: () => teamService.getAllUsers({ 
      page, 
      limit: perPage, 
      name: debouncedSearchTerm, 
      position: positionFilter 
    }),
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({ username, position }: { username: string, position: Position }) => 
      teamService.assignPosition(username, position),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', 'all'] });
      showToast(`Role updated successfully! ${variables.username} is now a ${variables.position}.`, 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update position', 'error');
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => teamService.deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', 'all'] });
      showToast('Member deleted successfully', 'success');
      setActiveMenuId(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete member', 'error');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (username: string) => authService.resetPassword(username),
    onSuccess: (_, username) => {
      showToast(`Password successfully reset for ${username} to default.`, 'success');
      setActiveMenuId(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to reset password', 'error');
    }
  });

  const handleDelete = (id: string, name: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Member',
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      confirmText: 'Delete Member',
      variant: 'danger',
      onConfirm: () => {
        deleteMemberMutation.mutate(id);
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetPassword = (username: string) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Reset Password',
      message: `Are you sure you want to reset the password for ${username} to the system default?`,
      confirmText: 'Reset Password',
      variant: 'info',
      onConfirm: () => {
        resetPasswordMutation.mutate(username);
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchedMembers = membersData?.users || [];
  const totalPages = membersData?.total_pages || 0;
  const totalEntries = membersData?.total || 0;

  const getPositionBadgeClass = (position: Position) => {
    switch (position?.toLowerCase()) {
      case 'lead':
        return 'bg-[#e0f2fe] text-[#0369a1]';
      case 'manager':
        return 'bg-[#f3e8ff] text-[#7e22ce]';
      case 'employee':
        return 'bg-[#f1f5f9] text-[#475569]';
      default:
        return 'bg-[#f1f5f9] text-[#475569]';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Team Management</h1>
          <p className="text-[#6b7280] mt-1 font-medium">Configure roles, permissions, and organizational hierarchy.</p>
        </div>
        <button 
          onClick={() => {
            if (user?.position === 'lead') {
              setIsAssignModalOpen(true);
            } else {
              setIsAddModalOpen(true);
            }
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4d44e3] hover:bg-[#4034d7] text-white rounded-xl font-semibold shadow-md shadow-[#4d44e3]/10 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          <span>{user?.position === 'lead' ? 'Assign Members' : 'Add Member'}</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-[#f1f5f9] overflow-hidden">
        {/* Filter Bar */}
        <div className="p-6 border-b border-[#f1f5f9] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative group w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] group-focus-within:text-[#4d44e3] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8fafc] border-none rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-[#4d44e3]/10 outline-none transition-all font-medium placeholder:text-[#94a3b8]/60"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select 
                value={positionFilter}
                onChange={(e) => {
                  setPositionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none bg-[#f8fafc] border-none rounded-xl px-4 py-3 pr-10 text-sm font-semibold text-[#475569] focus:ring-2 focus:ring-[#4d44e3]/10 outline-none transition-all cursor-pointer"
              >
                <option value="All">Position: All</option>
                <option value="lead">Lead</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#94a3b8]">
                <ChevronRight className="rotate-90" size={14} />
              </div>
            </div>
            
            <button 
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearchTerm('');
                setPositionFilter('All');
                setPage(1);
              }}
              className="p-3 bg-[#f8fafc] text-[#94a3b8] hover:text-[#4d44e3] rounded-xl transition-colors"
              title="Reset Filters"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] border-b border-[#f1f5f9]">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] border-b border-[#f1f5f9]">Email</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] border-b border-[#f1f5f9]">Current Position</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] border-b border-[#f1f5f9]">Change Position</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] border-b border-[#f1f5f9]">Last Updated</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] border-b border-[#f1f5f9] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-10 w-40 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-40 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-6 w-20 bg-gray-100 rounded-full"></div></td>
                    <td className="px-6 py-5"><div className="h-10 w-32 bg-gray-100 rounded-xl"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 bg-gray-100 rounded-lg"></div></td>
                    <td className="px-6 py-5"><div className="h-8 w-8 bg-gray-100 rounded-lg mx-auto"></div></td>
                  </tr>
                ))
              ) : fetchedMembers.length > 0 ? (
                fetchedMembers.map((member) => (
                  <tr key={member.id} className="group hover:bg-[#f8fafc]/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white">
                          <img 
                            src={`https://images.miraclesoft.com/employee-profile-pics/${member.username}.png`} 
                            alt={member.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#111827] leading-tight">{member.name}</p>
                          <p className="text-[11px] text-[#64748b] font-medium mt-0.5">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-medium text-[#475569]">{member.email}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPositionBadgeClass(member.position)}`}>
                        {member.position || 'Employee'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="relative inline-block w-full max-w-[140px]">
                        <select 
                          className="w-full appearance-none bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 text-xs font-semibold text-[#475569] hover:border-[#cbd5e1] focus:ring-2 focus:ring-[#4d44e3]/10 outline-none transition-all cursor-pointer"
                          value={member.position?.toLowerCase() || 'employee'}
                          onChange={(e) => {
                            updatePositionMutation.mutate({ 
                              username: member.username, 
                              position: e.target.value as Position 
                            });
                          }}
                        >
                          <option value="employee">Employee</option>
                          <option value="lead">Lead</option>
                          <option value="manager">Manager</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94a3b8]">
                          <ChevronRight className="rotate-90" size={12} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-[#64748b]">
                      {/* Assuming some fallback if updated_at is missing */}
                      {timeAgo(new Date())}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="relative inline-flex justify-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === member.id ? null : member.id);
                          }}
                          className="p-2 text-[#94a3b8] hover:text-[#4d44e3] hover:bg-[#4d44e3]/5 rounded-lg transition-all"
                          title="More actions"
                        >
                          <MoreVertical size={18} />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === member.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: -10 }}
                              className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white rounded-2xl shadow-xl border border-[#f1f5f9] overflow-hidden py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleResetPassword(member.username)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#475569] hover:bg-[#f8fafc] hover:text-[#4d44e3] transition-all"
                              >
                                <Key size={14} className="opacity-60" />
                                <span>Reset Password</span>
                              </button>
                              
                              <div className="h-px bg-[#f1f5f9] mx-2 my-1" />
                              
                              <button
                                onClick={() => handleDelete(member.id, member.name)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-all"
                              >
                                <Trash2 size={14} className="opacity-60" />
                                <span>Delete Member</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <p className="text-[#64748b] font-medium">No members found matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalEntries > 0 && (
          <div className="p-6 border-t border-[#f1f5f9] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-medium text-[#64748b]">
              Showing <span className="text-[#111827] font-bold">{(page - 1) * perPage + 1}</span> to <span className="text-[#111827] font-bold">{Math.min(page * perPage, totalEntries)}</span> of <span className="text-[#111827] font-bold">{totalEntries}</span> entries
            </p>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-[#94a3b8] hover:text-[#4d44e3] disabled:opacity-30 disabled:hover:text-[#94a3b8] transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                      page === i + 1 
                        ? 'bg-[#4d44e3] text-white shadow-md shadow-[#4d44e3]/20' 
                        : 'text-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-[#94a3b8] hover:text-[#4d44e3] disabled:opacity-30 disabled:hover:text-[#94a3b8] transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AddMemberModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      <AssignMembersModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        variant={confirmationModal.variant}
        isLoading={deleteMemberMutation.isPending || resetPasswordMutation.isPending}
      />
    </div>
  );
}
