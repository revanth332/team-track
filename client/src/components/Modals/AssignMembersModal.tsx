import React, { useState } from 'react';
import { X, UserPlus, Search, User, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../../services/api';
import { TeamMember } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AssignMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignMembersModal({ isOpen, onClose }: AssignMembersModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['unassigned-users'],
    queryFn: () => teamService.getUnassignedUsers(),
    enabled: isOpen
  });

  const allUsers = usersData || [];

  const assignMutation = useMutation({
    mutationFn: (data: { usernames: string[]; lead_id: string; manager_id: string }) => 
      teamService.assignMembers(data),
    onSuccess: () => {
      showToast('Members assigned successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['my-team'] });
      onClose();
      setSelectedUsernames(new Set());
      setSearchTerm('');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.detail || 'Failed to assign members', 'error');
    }
  });

  const toggleUser = (username: string) => {
    setSelectedUsernames(prev => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const removeUser = (username: string) => {
    setSelectedUsernames(prev => {
      const next = new Set(prev);
      next.delete(username);
      return next;
    });
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(u => u.username !== user?.username); // Don't assign self

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsernames.size === 0) {
      showToast('Please select at least one member', 'error');
      return;
    }

    if (!user?.username) return;
    
    const payload: any = {
      usernames: Array.from(selectedUsernames)
    };

    if (user.position === 'lead') {
      payload.lead_id = user.username;
      payload.manager_id = user.manager_id;
    } else if (user.position === 'manager') {
      payload.manager_id = user.username;
    }

    assignMutation.mutate(payload);
  };

  const selectedUsers = allUsers.filter(u => selectedUsernames.has(u.username));

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
            className="relative w-full max-w-lg bg-surface-container-high rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-on-surface tracking-tight">Assign Members</h2>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Add members to your team lead care</p>
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
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Select Members</label>
                  
                  <div className="relative group cursor-text bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users by name or username..."
                      className="w-full bg-transparent border-none p-0 text-sm outline-none font-medium"
                    />
                  </div>

                  {/* Inline User List */}
                  <div className="mt-3 bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden">
                    <div className="max-h-44 overflow-y-auto divide-y divide-outline-variant/10 pb-1">
                      {isLoading ? (
                        <div className="px-4 py-3 text-xs text-on-surface-variant font-medium">Loading users...</div>
                      ) : filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <button
                            key={u.username}
                            type="button"
                            onClick={() => toggleUser(u.username)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container-high transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {u.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-on-surface">{u.name}</p>
                                <p className="text-[10px] font-medium text-on-surface-variant">@{u.username}</p>
                              </div>
                            </div>
                            {selectedUsernames.has(u.username) && (
                              <Check size={16} className="text-primary" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-on-surface-variant font-medium flex items-center gap-2">
                          <AlertCircle size={14} />
                          No users found matching "{searchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selected Members Labels */}
                <div className="min-h-[60px]">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 px-1">
                    Selected ({selectedUsernames.size})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence mode="popLayout">
                      {selectedUsers.length > 0 ? (
                        selectedUsers.map((u) => (
                          <motion.span
                            key={u.username}
                            layout
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20"
                          >
                            <span>{u.name}</span>
                            <button 
                              type="button" 
                              onClick={() => removeUser(u.username)}
                              className="w-4 h-4 flex items-center justify-center hover:bg-primary/20 rounded-full transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </motion.span>
                        ))
                      ) : (
                        <p className="text-xs text-on-surface-variant/50 font-medium italic">No members selected</p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3.5 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-highest rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignMutation.isPending || selectedUsernames.size === 0}
                    className="flex-1 px-6 py-3.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    {assignMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                    ) : (
                      'Assign Members'
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
