import { MoreVertical, MessageSquare, Clock, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle, Edit2, Trash2, AlertTriangle, Cake, PieChart, ExternalLink, CheckCircle2, Circle, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../services/api';
import AddMemberModal from './Modals/AddMemberModal';
import AssignMembersModal from './Modals/AssignMembersModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import { useState, useRef, useEffect } from 'react';
import { TeamMember, ActiveProject } from '../types';
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

  const { user } = useAuth();
  const [selectedMemberForProjects, setSelectedMemberForProjects] = useState<TeamMember | null>(null);

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

          return (
            <motion.div
              key={`${member.id}-${index}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-outline-variant/5 hover:shadow-md transition-all group relative"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm ring-4 ring-surface bg-surface-container flex-shrink-0">
                  <img 
                    src={`https://images.miraclesoft.com/employee-profile-pics/${member.username}.png`} 
                    alt={member.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${member.username}/100/100`;
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-on-surface text-lg leading-tight truncate" title={member.name}>{member.name}</h3>
                  <p className="text-on-surface-variant text-sm font-semibold opacity-70 truncate" title={member.role}>{member.role}</p>
                  <p className="text-[10px] text-primary font-bold tracking-wider mt-1 truncate">{member.username}@miraclesoft.com</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(user?.position === 'lead' || user?.position === 'manager' || user?.admin) && (
                  <button 
                    onClick={() => setMemberToDeassign(member)}
                    className="p-2 text-error/40 hover:text-error transition-colors rounded-xl hover:bg-error/5"
                    title="Remove from team"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Project Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    remainingBandwidth > 60 ? 'bg-green-100 text-green-700' :
                    remainingBandwidth > 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {remainingBandwidth}% Available
                  </span>
                </div>
                <div className="space-y-3">
                  {member.active_projects && member.active_projects.length > 0 ? (
                    <div className="space-y-3">
                      {normalizedProjects.slice(0, 1).map((project, i) => (
                        <div 
                          key={`${project.title}-${i}`} 
                          className="bg-surface-container-low/50 rounded-xl p-2.5 border border-outline-variant/10 space-y-2 w-full"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-1 overflow-hidden">
                              <span className="text-[11px] font-bold text-on-surface truncate" title={project.title}>{project.title}</span>
                              {project.is_active && <span className="text-[10px] font-bold text-primary shrink-0">{project.occupancy}%</span>}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <span className={`w-fit px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${
                                project.is_active 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-surface-container-highest text-on-surface-variant/60'
                              }`}>
                                {project.is_active ? 'Active' : 'Ended'}
                              </span>
                              {project.client && (
                                <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-wide truncate max-w-[120px]" title={project.client}>
                                  Client: {project.client}
                                </span>
                              )}
                            </div>
                            {project.role && (
                              <p className="text-[9px] font-bold text-primary/70 italic mt-0.5">
                                Role: {project.role}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="text-[10px] font-bold text-on-surface-variant/60">
                          Projects: <span className="text-on-surface">{normalizedProjects.filter(p => p.is_active).length} active</span> / {normalizedProjects.length} total
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectSearch('');
                            setSelectedMemberForProjects(member);
                          }}
                          className="text-[10px] font-bold text-primary hover:underline z-10 shrink-0"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-on-surface-variant/40 italic">No project assignments</span>
                      <div className="text-[10px] font-bold text-on-surface-variant/60">
                        Projects: <span className="text-on-surface">0 active</span> / 0 total
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 mb-3">Core Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {member.skills && member.skills.length > 0 ? member.skills.map((skill) => (
                    <span key={skill} className="px-2.5 py-1 bg-surface-container-low text-on-surface text-[11px] font-semibold rounded-lg border border-outline-variant/10">
                      {skill}
                    </span>
                  )) : (
                    <span className="text-[11px] text-on-surface-variant/40 italic">No skills listed</span>
                  )}
                </div>
              </div>

              <div className="pt-5 border-t border-outline-variant/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Clock size={16} className="opacity-40" />
                    <span className="text-xs font-bold tracking-tight">
                      {formatTime12h(member.shift_start)} - {formatTime12h(member.shift_end)}
                    </span>
                  </div>
                  {member.birthday && (
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <Cake size={14} className="opacity-40 text-tertiary" />
                      <span className="text-[10px] font-bold tracking-tight">
                        {new Date(member.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )})}
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

      {/* Project Details Modal */}
      <AnimatePresence>
        {selectedMemberForProjects && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMemberForProjects(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-8 overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-start mb-4 shrink-0">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-on-surface">Projects Portfolio</h3>
                  <p className="text-on-surface-variant text-xs font-medium mt-1">
                    Assignments for {selectedMemberForProjects.name}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedMemberForProjects(null)}
                  className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search input */}
              <div className="mb-6 relative group shrink-0">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search projects by name..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {normalizeProjects(selectedMemberForProjects.active_projects)
                    .filter(project => project.title.toLowerCase().includes(projectSearch.toLowerCase()))
                    .sort((a, b) => {
                      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
                      return b.occupancy - a.occupancy;
                    })
                    .map((project, i) => (
                      <div key={`${project.title}-${i}`} className="bg-surface-container-low/40 rounded-2xl p-4 border border-outline-variant/10 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-on-surface text-sm">{project.title}</h4>
                            <div className="flex flex-wrap gap-2 items-center mt-1.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                project.is_active 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-surface-container-highest text-on-surface-variant/60'
                              }`}>
                                {project.is_active ? 'Currently Active' : 'Project Completed'}
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
                        
                        {project.description ? (
                          <p className="text-xs text-on-surface-variant/70 leading-relaxed font-medium">
                            {project.description}
                          </p>
                        ) : (
                          <p className="text-xs text-on-surface-variant/30 leading-relaxed font-medium italic">
                            No description provided
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-outline-variant/10 shrink-0">
                <button 
                  onClick={() => setSelectedMemberForProjects(null)}
                  className="w-full py-3 bg-surface-container-high rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  Close Portfolio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
