import { MoreVertical, MessageSquare, Clock, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle, Edit2, Trash2, AlertTriangle, Cake, PieChart, ExternalLink, CheckCircle2, Circle, X, Search, Calendar, CalendarOff, User, Mail, Hash, Briefcase, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService, leaveService } from '../services/api';
import AddMemberModal from './Modals/AddMemberModal';
import AssignMembersModal from './Modals/AssignMembersModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import MarkLeaveModal from './Modals/MarkLeaveModal';
import { useState, useRef, useEffect, useMemo } from 'react';
import { TeamMember, ActiveProject, Leave } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TeamSkeleton } from './ui/Skeleton';

export default function TeamDirectory() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [memberToDeassign, setMemberToDeassign] = useState<TeamMember | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);

  const { user } = useAuth();
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<TeamMember | null>(null);
  const [memberForLeave, setMemberForLeave] = useState<TeamMember | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuMemberId(null);
    if (activeMenuMemberId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenuMemberId]);

  const normalizeProjects = (projects: (string | ActiveProject)[]): ActiveProject[] => {
    return (projects || []).map(p => {
      if (typeof p === 'string') {
        return {
          title: p,
          description: '',
          is_active: true,
          occupancy: 0,
          client: '',
          role: ''
        };
      }
      return {
        title: p.title || '',
        description: p.description || '',
        is_active: p.is_active !== undefined ? p.is_active : true,
        occupancy: Math.min(100, Math.max(0, p.occupancy || 0)),
        client: p.client || '',
        role: p.role || ''
      };
    });
  };

  const { data: members, isLoading, isError, error } = useQuery({
    queryKey: ['members'],
    queryFn: () => teamService.getMembers(),
  });

  const { data: activeLeaves } = useQuery({
    queryKey: ['active-leaves'],
    queryFn: () => leaveService.getActiveLeaves(),
  });

  const activeLeavesMap = useMemo(() => {
    const map = new Map<string, Leave>();
    (activeLeaves || []).forEach(l => {
      if (l.username) {
        map.set(l.username.toLowerCase(), l);
      }
    });
    return map;
  }, [activeLeaves]);

  const endLeaveMutation = useMutation({
    mutationFn: (leaveId: string) => leaveService.endLeaveEarly(leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Leave ended early. Member reactivated!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.detail || error.message || 'Failed to end leave', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: teamService.deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Member deleted successfully!', 'success');
      setMemberToDelete(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete member', 'error');
    }
  });

  const deassignMutation = useMutation({
    mutationFn: teamService.deassignMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Member removed from team successfully!', 'success');
      setMemberToDeassign(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to remove member from team', 'error');
    }
  });

  const confirmDelete = () => {
    if (memberToDelete) {
      deleteMutation.mutate(memberToDelete.id);
    }
  };

  const confirmDeassign = () => {
    if (memberToDeassign) {
      deassignMutation.mutate(memberToDeassign.username);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
  };

  const formatTime12h = (timeStr: string | undefined) => {
    if (!timeStr) return '09:00 AM';
    try {
      // Handle HH:mm:ss or HH:mm
      const [hours, minutes] = timeStr.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <TeamSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-error">
        <AlertCircle className="mb-4" size={40} />
        <p className="font-bold tracking-tight">Failed to load team directory</p>
        <p className="text-sm mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Team Directory</h2>
          <p className="text-on-surface-variant mt-1 font-medium">Manage {members?.length || 0} active members</p>
        </div>
        {(user?.admin || user?.position === 'lead') && <button 
          onClick={() => {
            if (user?.position === 'lead') {
              setIsAssignModalOpen(true);
            } else {
              setIsAddModalOpen(true);
            }
          }}
          className="primary-gradient text-on-primary px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>{user?.position === 'lead' ? 'Assign Members' : 'Add Member'}</span>
        </button>}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {members?.map((member, index) => {
          const normalizedProjects = normalizeProjects(member.active_projects)
            .sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
          const totalOccupancy = normalizedProjects.reduce((sum, p) => sum + (p.is_active ? p.occupancy : 0), 0);
          const remainingBandwidth = Math.max(0, 100 - totalOccupancy);
          const memberActiveLeave = activeLeavesMap.get(member.username.toLowerCase());
          const isMenuOpen = activeMenuMemberId === member.id;

          return (
            <motion.div
              key={`${member.id}-${index}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedMemberForDetail(member)}
              className={`bg-surface-container-lowest rounded-3xl p-6 shadow-sm border ${
                memberActiveLeave ? 'border-amber-500/30 ring-2 ring-amber-500/10' : 'border-outline-variant/10'
              } hover:shadow-md hover:border-primary/30 transition-all group relative cursor-pointer flex flex-col justify-between`}
            >
              <div>
                {/* Top Section: Avatar, Name & More Menu */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1 pr-2">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm ring-4 ring-surface bg-surface-container flex-shrink-0 relative">
                      <img 
                        src={`https://images.miraclesoft.com/employee-profile-pics/${member.username}.png`} 
                        alt={member.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${member.username}/100/100`;
                        }}
                      />
                      {memberActiveLeave && (
                        <div className="absolute inset-0 bg-amber-500/30 backdrop-blur-[1px] flex items-center justify-center text-amber-950 font-bold text-[8px] uppercase">
                          Leave
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-on-surface text-base leading-snug truncate group-hover:text-primary transition-colors" title={member.name}>
                        {member.name}
                      </h3>
                      <p className="text-on-surface-variant text-xs font-semibold opacity-70 truncate" title={member.role}>
                        {member.role}
                      </p>
                      <p className="text-[10px] text-primary font-bold tracking-wider mt-0.5 truncate">
                        {member.username}@miraclesoft.com
                      </p>
                    </div>
                  </div>

                  {/* Actions Dropdown Menu */}
                  {(user?.position === 'lead' || user?.position === 'manager' || user?.admin) && (
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuMemberId(isMenuOpen ? null : member.id);
                        }}
                        className="p-2 rounded-xl text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-high transition-all"
                        title="More options"
                      >
                        <MoreVertical size={18} />
                      </button>

                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-outline-variant/10 py-1.5 z-50 overflow-hidden"
                          >
                            {memberActiveLeave ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMemberId(null);
                                  endLeaveMutation.mutate(memberActiveLeave.id);
                                }}
                                disabled={endLeaveMutation.isPending}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Clock size={15} />
                                <span>End Leave Early</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuMemberId(null);
                                  setMemberForLeave(member);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-on-surface hover:bg-surface-container-low flex items-center gap-2.5 transition-colors"
                              >
                                <Calendar size={15} className="text-amber-600" />
                                <span>Mark Leave</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuMemberId(null);
                                setMemberToDeassign(member);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-error hover:bg-error/5 flex items-center gap-2.5 transition-colors border-t border-outline-variant/10"
                            >
                              <Trash2 size={15} />
                              <span>Remove from Team</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Projects count and Bandwidth Badge */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-on-surface-variant/70">
                      Projects: <span className="text-on-surface font-extrabold">{normalizedProjects.filter(p => p.is_active).length} active</span> / {normalizedProjects.length} total
                    </div>
                    {memberActiveLeave ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200" title={`On leave from ${memberActiveLeave.start_date} to ${memberActiveLeave.end_date}`}>
                        On Leave
                      </span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        remainingBandwidth > 60 ? 'bg-green-100 text-green-700' :
                        remainingBandwidth > 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {remainingBandwidth}% Available
                      </span>
                    )}
                  </div>

                  {/* Core Skills (Max 3 + Count) */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-2">Core Skills</p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {member.skills && member.skills.length > 0 ? (
                        <>
                          {member.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="px-2.5 py-1 bg-surface-container-low text-on-surface text-[10px] font-semibold rounded-lg border border-outline-variant/10">
                              {skill}
                            </span>
                          ))}
                          {member.skills.length > 3 && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md">
                              +{member.skills.length - 3} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant/40 italic">No skills listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Shift and Birthday */}
              <div className="pt-4 mt-5 border-t border-outline-variant/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Clock size={14} className="opacity-40" />
                  <span className="text-[11px] font-bold tracking-tight">
                    {formatTime12h(member.shift_start)} - {formatTime12h(member.shift_end)}
                  </span>
                </div>
                {member.birthday && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <Cake size={13} className="opacity-40 text-tertiary" />
                    <span className="text-[10px] font-bold tracking-tight">
                      {new Date(member.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>


      <AddMemberModal 
        isOpen={isAddModalOpen} 
        onClose={handleCloseModal} 
      />

      <AssignMembersModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Member"
        message={`Are you sure you want to delete ${memberToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete Member"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationModal
        isOpen={!!memberToDeassign}
        onClose={() => setMemberToDeassign(null)}
        onConfirm={confirmDeassign}
        title="Remove from Team"
        message={`Are you sure you want to remove ${memberToDeassign?.name} from your team?`}
        confirmText="Remove Member"
        isLoading={deassignMutation.isPending}
      />

      <MarkLeaveModal
        isOpen={!!memberForLeave}
        onClose={() => setMemberForLeave(null)}
        member={memberForLeave}
      />

      {/* Member Full Details Modal */}
      <AnimatePresence>
        {selectedMemberForDetail && (() => {
          const detailProjects = normalizeProjects(selectedMemberForDetail.active_projects)
            .sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
          const detailOccupancy = detailProjects.reduce((sum, p) => sum + (p.is_active ? p.occupancy : 0), 0);
          const detailBandwidth = Math.max(0, 100 - detailOccupancy);
          const detailLeave = activeLeavesMap.get(selectedMemberForDetail.username.toLowerCase());

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedMemberForDetail(null)}
                className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col"
              >
                {/* Header with Full Name and Details */}
                <div className="flex justify-between items-start pb-6 border-b border-outline-variant/10 shrink-0">
                  <div className="flex items-start gap-4 min-w-0 flex-1 pr-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md ring-4 ring-surface bg-surface-container shrink-0 relative">
                      <img 
                        src={`https://images.miraclesoft.com/employee-profile-pics/${selectedMemberForDetail.username}.png`} 
                        alt={selectedMemberForDetail.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${selectedMemberForDetail.username}/100/100`;
                        }}
                      />
                      {detailLeave && (
                        <div className="absolute inset-0 bg-amber-500/30 backdrop-blur-[1px] flex items-center justify-center text-amber-950 font-bold text-[9px] uppercase">
                          On Leave
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface break-words">
                        {selectedMemberForDetail.name}
                      </h3>
                      <p className="text-sm font-semibold text-primary opacity-90 mt-0.5">
                        {selectedMemberForDetail.role}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-on-surface-variant/70 font-medium">
                        <span className="font-semibold text-primary/90">{selectedMemberForDetail.username}@miraclesoft.com</span>
                        {selectedMemberForDetail.empid && (
                          <span className="px-2 py-0.5 bg-surface-container-high rounded-md text-[10px] font-bold">
                            ID: {selectedMemberForDetail.empid}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-primary/10 text-primary uppercase font-bold text-[10px] rounded-md">
                          {selectedMemberForDetail.position || 'Employee'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMemberForDetail(null)}
                    className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant shrink-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1 custom-scrollbar">
                  {/* Leave Banner if active */}
                  {detailLeave && (
                    <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center gap-3.5 text-amber-950">
                      <div className="p-2 bg-amber-500/20 rounded-xl shrink-0 text-amber-700">
                        <CalendarOff size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">Member is Currently on Leave</h4>
                        <p className="text-xs font-semibold mt-0.5">
                          From <strong>{detailLeave.start_date}</strong> to <strong>{detailLeave.end_date}</strong>
                          {detailLeave.reason ? ` — "${detailLeave.reason}"` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Available Bandwidth</p>
                      <p className="text-lg font-extrabold text-primary mt-1">{detailBandwidth}%</p>
                    </div>

                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Shift Timings</p>
                      <p className="text-xs font-bold text-on-surface mt-1.5 flex items-center gap-1.5">
                        <Clock size={13} className="text-primary opacity-60" />
                        {formatTime12h(selectedMemberForDetail.shift_start)} - {formatTime12h(selectedMemberForDetail.shift_end)}
                      </p>
                    </div>

                    <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Birthday</p>
                      <p className="text-xs font-bold text-on-surface mt-1.5 flex items-center gap-1.5">
                        <Cake size={13} className="text-tertiary opacity-80" />
                        {selectedMemberForDetail.birthday 
                          ? new Date(selectedMemberForDetail.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* All Skills */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">All Core Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMemberForDetail.skills && selectedMemberForDetail.skills.length > 0 ? (
                        selectedMemberForDetail.skills.map((skill) => (
                          <span key={skill} className="px-3 py-1.5 bg-surface-container-low text-on-surface text-xs font-semibold rounded-xl border border-outline-variant/10">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-on-surface-variant/40 italic">No skills listed</span>
                      )}
                    </div>
                  </div>

                  {/* Projects Portfolio */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                        Project Assignments ({detailProjects.length})
                      </h4>
                      <span className="text-[11px] font-bold text-primary">
                        {detailProjects.filter(p => p.is_active).length} Active Engagements
                      </span>
                    </div>

                    <div className="space-y-3">
                      {detailProjects.length > 0 ? (
                        detailProjects.map((project, i) => (
                          <div key={`${project.title}-${i}`} className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/10 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-bold text-on-surface text-sm">{project.title}</h5>
                                <div className="flex flex-wrap gap-2 items-center mt-1">
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                    project.is_active ? 'bg-green-100 text-green-700' : 'bg-surface-container-highest text-on-surface-variant/60'
                                  }`}>
                                    {project.is_active ? 'Active' : 'Completed'}
                                  </span>
                                  {project.client && (
                                    <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                      Client: {project.client}
                                    </span>
                                  )}
                                  {project.role && (
                                    <span className="bg-secondary/5 text-secondary px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                      Role: {project.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {project.is_active && (
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-bold text-primary">{project.occupancy}%</p>
                                  <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-0.5">Occupancy</p>
                                </div>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-xs text-on-surface-variant/70 leading-relaxed pt-1 font-medium">
                                {project.description}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-on-surface-variant/40 italic text-xs">
                          No project assignments found
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-end shrink-0">
                  <button 
                    onClick={() => setSelectedMemberForDetail(null)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
