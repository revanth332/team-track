import React, { useState, useEffect } from 'react';
import { X, User, Mail, Briefcase, Hash, Code, Cake, Clock, AtSign, Layout, PieChart, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../../services/api';
import { UserCreate, TeamMember, ActiveProject } from '../../types';
import { useToast } from '../../context/ToastContext';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [skillsInput, setSkillsInput] = useState('');
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);

  const [formData, setFormData] = useState<UserCreate>({
    name: '',
    username: '',
    email: '',
    empid: '',
    role: '',
    position: 'employee',
    active_projects: [],
    bandwidth: 100,
    skills: [],
    shift_start: '09:00',
    shift_end: '17:00',
  });

  useEffect(() => {
    if (isOpen) {
      setSkillsInput('');
      setActiveProjects([]);
      setFormData({
        name: '',
        username: '',
        email: '',
        empid: '',
        role: '',
        position: 'employee',
        active_projects: [],
        bandwidth: 100,
        skills: [],
        shift_start: '09:00',
        shift_end: '17:00',
      });
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: teamService.createMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      showToast('Member added successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to add member', 'error');
    }
  });

  const handleAddProject = () => {
    const newProject: ActiveProject = {
      title: '',
      description: '',
      is_active: true,
      occupancy: 0,
      client: '',
      role: ''
    };
    const updated = [...activeProjects, newProject];
    setActiveProjects(updated);
    setFormData({ ...formData, active_projects: updated });
  };

  const handleUpdateProject = (index: number, updates: Partial<ActiveProject>) => {
    const updated = activeProjects.map((p, i) => i === index ? { ...p, ...updates } : p);
    setActiveProjects(updated);
    setFormData({ ...formData, active_projects: updated });
  };

  const handleRemoveProject = (index: number) => {
    const updated = activeProjects.filter((_, i) => i !== index);
    setActiveProjects(updated);
    setFormData({ ...formData, active_projects: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalOccupancy = activeProjects.reduce((sum, p) => sum + (p.is_active ? p.occupancy : 0), 0);
    const remainingBandwidth = Math.max(0, 100 - totalOccupancy);

    const submissionData = {
      ...formData,
      position: formData.position || 'employee',
      active_projects: activeProjects,
      username: formData.username.trim().toLowerCase(),
      bandwidth: remainingBandwidth
    };
    createMutation.mutate(submissionData);
  };

  const isPending = createMutation.isPending;

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
                  Add New Member
                </h3>
                <p className="text-on-surface-variant text-sm font-medium mt-1">
                  Create a new team member profile in the directory.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                      placeholder="Jane Doe"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Username</label>
                  <div className="relative group">
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="janedoe"
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
                      placeholder="jane.doe@company.com"
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
                      placeholder="6062"
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
                      placeholder="Frontend Developer"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Position</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <select 
                      required
                      value={formData.position || 'employee'}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value as any })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    >
                      <option value="employee">Employee</option>
                      <option value="lead">Lead</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>

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

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Shift Start</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="time" 
                      value={formData.shift_start}
                      onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Shift End</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="time" 
                      value={formData.shift_end}
                      onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Portfolio Projects</label>
                    <button 
                      type="button"
                      onClick={handleAddProject}
                      className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-colors"
                    >
                      <Plus size={14} />
                      Add Project
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {activeProjects.map((project, index) => (
                      <div key={index} className="bg-surface-container-low/30 rounded-2xl p-4 border border-outline-variant/10 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[9px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">Title</label>
                                <input 
                                  type="text" 
                                  required
                                  value={project.title}
                                  onChange={(e) => handleUpdateProject(index, { title: e.target.value })}
                                  placeholder="Project Title"
                                  className="w-full bg-white border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 font-medium"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1.5 ml-1">
                                  <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase">Occupancy</label>
                                  <span className="text-[9px] font-bold text-primary">{project.occupancy}%</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="0"
                                  max="100"
                                  value={project.occupancy}
                                  onChange={(e) => handleUpdateProject(index, { occupancy: parseInt(e.target.value) })}
                                  className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-on-surface-variant/60 uppercase mb-1.5 ml-1">Description</label>
                              <textarea 
                                value={project.description}
                                onChange={(e) => handleUpdateProject(index, { description: e.target.value })}
                                placeholder="Brief project overview..."
                                rows={2}
                                className="w-full bg-white border-none rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 font-medium resize-none"
                              />
                            </div>

                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <div 
                                  onClick={() => handleUpdateProject(index, { is_active: !project.is_active })}
                                  className={`w-8 h-4 rounded-full relative transition-colors ${project.is_active ? 'bg-primary' : 'bg-surface-container-highest'}`}
                                >
                                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${project.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                </div>
                                <span className="text-[10px] font-bold text-on-surface-variant">Active Project</span>
                              </label>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleRemoveProject(index)}
                            className="p-2 text-on-surface-variant/40 hover:text-error transition-colors rounded-lg hover:bg-error/5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {activeProjects.length === 0 && (
                      <div className="text-center py-8 bg-surface-container-low/20 rounded-2xl border border-dashed border-outline-variant/20">
                        <Layout size={32} className="mx-auto text-on-surface-variant/20 mb-2" />
                        <p className="text-xs font-bold text-on-surface-variant/40 italic">No projects added yet</p>
                      </div>
                    )}
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
                      placeholder="React, TypeScript"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-outline-variant/5">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPending}
                  className="primary-gradient text-on-primary px-10 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-70"
                >
                  {isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
