import React, { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Hash, Code, Cake, Clock, AtSign, Layout, ShieldCheck, Plus, Trash2, Save, Loader2, FileSpreadsheet, PieChart, AlertTriangle, Edit, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../services/api';
import { UserCreate, TeamMember, ActiveProject } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BandwidthMailModal from './Modals/BandwidthMailModal';

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [skillsInput, setSkillsInput] = useState('');
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState<ActiveProject>({
    title: '',
    description: '',
    is_active: true,
    occupancy: 0,
    client: '',
    role: ''
  });

  // Fetch current user detail
  const { data: currentUserData, isLoading: isFetching } = useQuery({
    queryKey: ['user-detail'],
    queryFn: () => teamService.getUserDetail(),
  });

  const [formData, setFormData] = useState<UserCreate & { shift_sheet_name?: string }>({
    name: '',
    username: '',
    email: '',
    empid: '',
    role: '',
    active_projects: [],
    bandwidth: 100,
    skills: [],
    shift_start: '09:00',
    shift_end: '17:00',
    shift_sheet_name: '',
  });

  useEffect(() => {
    if (currentUserData) {
      setSkillsInput(currentUserData.skills?.join(', ') || '');
      const normalizedProjects = normalizeProjectsForForm(currentUserData.active_projects || []);
      setActiveProjects(normalizedProjects);
      setFormData({
        name: currentUserData.name,
        username: currentUserData.username,
        email: currentUserData.email,
        empid: currentUserData.empid,
        role: currentUserData.role,
        active_projects: normalizedProjects,
        bandwidth: currentUserData.bandwidth !== undefined ? currentUserData.bandwidth : 100,
        skills: currentUserData.skills,
        shift_start: currentUserData.shift_start?.slice(0, 5) || '09:00',
        shift_end: currentUserData.shift_end?.slice(0, 5) || '17:00',
        birthday: currentUserData.birthday,
        shift_sheet_name: currentUserData.shift_sheet_name || '',
      });
    }
  }, [currentUserData]);

  const normalizeProjectsForForm = (projects: (string | any)[]): ActiveProject[] => {
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

  const updateMutation = useMutation({
    mutationFn: (data: UserCreate) => teamService.updateMember(currentUserData!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail'] });
      showToast('Profile updated successfully!', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update profile', 'error');
    }
  });

  const isBandwidthOutdated = React.useMemo(() => {
    if (!currentUserData?.last_updated) return true;
    try {
      const lastUpdatedDate = new Date(currentUserData.last_updated).toDateString();
      const todayDate = new Date().toDateString();
      return lastUpdatedDate !== todayDate;
    } catch {
      return true;
    }
  }, [currentUserData?.last_updated]);

  const handleOpenAddProjectModal = () => {
    setProjectForm({
      title: '',
      description: '',
      is_active: true,
      occupancy: 0,
      client: '',
      role: ''
    });
    setEditingProjectIndex(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProjectModal = (index: number) => {
    setProjectForm(activeProjects[index]);
    setEditingProjectIndex(index);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProjectIndex !== null) {
      const updated = activeProjects.map((p, i) => i === editingProjectIndex ? projectForm : p);
      setActiveProjects(updated);
    } else {
      setActiveProjects([...activeProjects, projectForm]);
    }
    setIsProjectModalOpen(false);
  };

  const handleRemoveProject = (index: number) => {
    const updated = activeProjects.filter((_, i) => i !== index);
    setActiveProjects(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalOccupancy = activeProjects.reduce((sum, p) => sum + (p.is_active ? p.occupancy : 0), 0);
    const remainingBandwidth = Math.max(0, 100 - totalOccupancy);

    const submissionData = {
      ...formData,
      active_projects: activeProjects,
      bandwidth: remainingBandwidth
    };
    updateMutation.mutate(submissionData);
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-on-surface-variant">
        <User size={48} className="opacity-20 mb-4" />
        <p className="font-medium text-lg">Profile data not found.</p>
        <p className="text-sm opacity-60">Please ensure you are assigned to a team.</p>
      </div>
    );
  }

  const userPosition = (user?.position || currentUserData?.position || '').toLowerCase();
  const isLead = userPosition === 'lead';
  const isLeadUser = userPosition === 'lead' || userPosition === 'manager' || user?.role === 'admin';
  const totalOccupancy = activeProjects.reduce((sum, p) => sum + (p.is_active ? p.occupancy : 0), 0);
  const isOverOccupied = totalOccupancy > 100;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 pb-24">
      <header className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-on-surface">My Profile</h2>
        <p className="text-on-surface-variant font-medium">Manage your personal information, work schedule, and project portfolio.</p>
      </header>

      {/* Outdated Bandwidth Warning Banner */}
      {isBandwidthOutdated && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3.5 text-amber-900 dark:text-amber-300 shadow-sm">
          <div className="p-2.5 bg-amber-500/20 rounded-xl shrink-0 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">Bandwidth Information Outdated</h4>
            <p className="text-xs font-medium opacity-90 mt-0.5">
              Your bandwidth information is outdated. Please review your project portfolio and click <strong>Save Profile Changes</strong> to update your daily status.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column: Basic Info */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 text-center">
            <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-md ring-4 ring-surface bg-surface-container mx-auto mb-4">
              <img 
                src={`https://images.miraclesoft.com/employee-profile-pics/${user?.username}.png`} 
                alt={user?.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${user?.username}/200/200`;
                }}
              />
            </div>
            <h3 className="text-xl font-bold text-on-surface">{formData.name}</h3>
            <p className="text-sm font-semibold text-primary opacity-80 mb-1">{formData.role}</p>
            <p className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">{formData.username}</p>
          </div>

          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <PieChart size={20} />
              </div>
              <h4 className="font-bold text-on-surface">Current Bandwidth</h4>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-3xl font-extrabold text-primary">{formData.bandwidth ?? 100}%</span>
                <span className="text-xs font-bold text-on-surface-variant/60">Available</span>
              </div>
              <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${formData.bandwidth ?? 100}%` }}
                  className="h-full bg-primary"
                />
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider">
                Project Load: {100 - (formData.bandwidth ?? 100)}%
              </p>
            </div>
          </div>

          {/* Daily Bandwidth Email Settings Card (Lead/Manager/Admin Only) */}
          {isLeadUser && (
            <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-sm">Daily Bandwidth Mailer</h4>
                  <p className="text-[11px] text-on-surface-variant font-medium">Automated 5:00 PM IST Alert</p>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant/70 font-medium leading-relaxed">
                Configure your Zoho credentials and receiver emails to automatically send daily bandwidth reports for your team at 5 PM.
              </p>
              <button
                type="button"
                onClick={() => setIsMailModalOpen(true)}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold text-xs shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Mail size={16} />
                <span>Configure Mail Settings</span>
              </button>
            </div>
          )}
        </div>

        {/* Right column: Form */}
        <form onSubmit={handleSubmit} className="lg:w-2/3 space-y-8">
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant/10 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Employee ID</label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    required
                    value={formData.empid}
                    onChange={(e) => setFormData({ ...formData, empid: e.target.value })}
                    className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Role</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              {isLead && (
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Shift Sheet Name</label>
                  <div className="relative group">
                    <FileSpreadsheet className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      value={formData.shift_sheet_name || ''}
                      onChange={(e) => setFormData({ ...formData, shift_sheet_name: e.target.value })}
                      placeholder="e.g. Lead_Shift_Logs_2024"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium border border-primary/10"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-primary mt-1.5 ml-1 opacity-70 italic">Crucial for fetching logs. Ensure this matches your Shift Log sheet exactly.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Birthday</label>
                <div className="relative group">
                  <Cake className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="date" 
                    value={formData.birthday || ''}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Shift Start</label>
                  <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                    <input 
                      type="time" 
                      value={formData.shift_start}
                      onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-10 pr-2 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Shift End</label>
                  <div className="relative group">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                    <input 
                      type="time" 
                      value={formData.shift_end}
                      onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-10 pr-2 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Skills (comma separated)</label>
                <div className="relative group">
                  <Code className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={skillsInput}
                    onChange={(e) => {
                      setSkillsInput(e.target.value);
                      const skillsArray = e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s !== '');
                      setFormData({ ...formData, skills: skillsArray });
                    }}
                    className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">My Projects Portfolio</label>
                <button 
                  type="button"
                  onClick={handleOpenAddProjectModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-colors self-start sm:self-auto"
                >
                  <Plus size={14} />
                  Add Project
                </button>
              </div>

              {/* Real-time search box */}
              <div className="relative group shrink-0">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search projects by name..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                />
              </div>
              
              {/* Scrollable list of projects */}
              <div className="max-h-[380px] overflow-y-auto pr-2 space-y-4 custom-scrollbar border border-outline-variant/10 rounded-2xl p-4 bg-surface-container-low/20">
                {activeProjects.length > 0 ? (
                  activeProjects
                    .map((project, index) => ({ project, originalIndex: index }))
                    .filter(item => item.project.title.toLowerCase().includes(projectSearch.toLowerCase()))
                    .map(({ project, originalIndex }) => (
                      <div key={originalIndex} className="bg-surface-container-low/40 rounded-2xl p-4 border border-outline-variant/10 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-on-surface text-sm truncate" title={project.title}>{project.title}</h4>
                            <div className="flex flex-wrap gap-2 items-center mt-1.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                project.is_active 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-surface-container-highest text-on-surface-variant/60'
                              }`}>
                                {project.is_active ? 'Currently Active' : 'Project Completed'}
                              </span>
                              {project.client && (
                                <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider truncate max-w-[150px]" title={project.client}>
                                  Client: {project.client}
                                </span>
                              )}
                              {project.role && (
                                <span className="bg-secondary/5 text-secondary px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider truncate max-w-[150px]" title={project.role}>
                                  Role: {project.role}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {project.is_active && (
                              <div className="text-right">
                                <p className="text-xs font-bold text-primary">{project.occupancy}%</p>
                                <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-0.5">Occupancy</p>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 ml-2 border-l border-outline-variant/20 pl-3">
                              <button 
                                type="button"
                                onClick={() => handleOpenEditProjectModal(originalIndex)}
                                className="p-1.5 text-on-surface-variant/60 hover:text-primary transition-colors rounded-lg hover:bg-primary/5"
                                title="Edit Project"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleRemoveProject(originalIndex)}
                                className="p-1.5 text-on-surface-variant/60 hover:text-error transition-colors rounded-lg hover:bg-error/5"
                                title="Delete Project"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
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
                    ))
                ) : (
                  <div className="text-center py-8 text-on-surface-variant/40 italic text-xs font-medium">
                    No projects found in your portfolio. Click "Add Project" to begin.
                  </div>
                )}
                {activeProjects.length > 0 && activeProjects.filter(p => p.title.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant/40 italic text-xs font-medium">
                    No projects match your search search.
                  </div>
                )}
              </div>
            </div>

            {isOverOccupied && (
              <div className="mx-8 p-4 bg-error/5 border border-error/20 rounded-2xl flex items-center gap-3 text-error animate-pulse">
                <AlertTriangle size={20} />
                <div className="flex-1">
                  <p className="text-sm font-bold">Over Capacity!</p>
                  <p className="text-[11px] font-medium opacity-80 leading-tight">Total occupancy across all active projects is {totalOccupancy}%. Please reduce assignments to 100% or less to save.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-outline-variant/10">
              <button 
                type="submit"
                disabled={updateMutation.isPending || isOverOccupied}
                className="primary-gradient text-on-primary px-12 py-4 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Project Add/Edit Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            onClick={() => setIsProjectModalOpen(false)}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-on-surface">
                  {editingProjectIndex !== null ? 'Modify Project' : 'Add New Project'}
                </h3>
                <p className="text-on-surface-variant text-[11px] font-semibold opacity-70 mt-1">
                  {editingProjectIndex !== null ? 'Modify details of your project assignment' : 'Specify details of your assignment'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">Project Title</label>
                <input 
                  type="text" 
                  required
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="e.g. Project Alpha"
                  className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-medium text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">Client Name</label>
                  <input 
                    type="text" 
                    required
                    value={projectForm.client}
                    onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })}
                    placeholder="e.g. Client Beta"
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-medium text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">Role</label>
                  <input 
                    type="text" 
                    required
                    value={projectForm.role}
                    onChange={(e) => setProjectForm({ ...projectForm, role: e.target.value })}
                    placeholder="e.g. Lead Developer"
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-medium text-on-surface"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Project Occupancy</label>
                  <span className="text-xs font-bold text-primary">{projectForm.occupancy}%</span>
                </div>
                <input 
                  type="range" 
                  min="0"
                  max="100"
                  value={projectForm.occupancy}
                  onChange={(e) => setProjectForm({ ...projectForm, occupancy: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">Description</label>
                <textarea 
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  placeholder="Describe your goals or role responsibilities..."
                  rows={3}
                  className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-medium text-on-surface resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase">Project Status</label>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold transition-colors ${projectForm.is_active ? 'text-green-600' : 'text-on-surface-variant/40'}`}>
                    {projectForm.is_active ? 'Active Engagement' : 'Completed Assignments'}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setProjectForm({ ...projectForm, is_active: !projectForm.is_active })}
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 outline-none ${
                      projectForm.is_active ? 'bg-green-500' : 'bg-surface-container-highest'
                    }`}
                  >
                    <motion.div 
                      animate={{ x: projectForm.is_active ? 18 : 4 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                <button 
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 primary-gradient text-on-primary rounded-xl text-xs font-bold tracking-wide transition-colors"
                >
                  Save Project
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Bandwidth Mail Settings Modal */}
      <BandwidthMailModal
        isOpen={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
      />
    </div>
  );
}
