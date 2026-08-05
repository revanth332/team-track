import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Briefcase, UserCircle, Layout, Calendar, Loader2, CheckCircle2, AlertCircle as AlertIcon, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WeeklyUpdateApi, WeeklyUpdateApiCreate, WeeklyUpdateProjectInfo, ActiveProject } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weeklyUpdateService, teamService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getWeekString, getMondayFromWeek, getFridayFromWeek, getDefaultWeek, getWeekLabel } from '../../utils/dateUtils';
import RichTextEditor from '../common/RichTextEditor';
import { useToast } from '../../context/ToastContext';

interface WeeklyAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WeeklyUpdateApi | null;
}

export default function WeeklyAchievementModal({ isOpen, onClose, initialData }: WeeklyAchievementModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<{
    week: string;
    occupancy: number;
    projects: { project_name: string; client: string; role: string; task_description: string }[];
  }>({
    week: getDefaultWeek(),
    occupancy: 0,
    projects: []
  });

  const { data: userDetail } = useQuery({
    queryKey: ['user-detail'],
    queryFn: () => teamService.getUserDetail(),
    enabled: isOpen,
  });

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
        occupancy: p.occupancy || 0,
        client: p.client || '',
        role: p.role || ''
      };
    });
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        week: getWeekString(new Date(initialData.week_end_date)),
        occupancy: initialData.occupancy || 0,
        projects: (initialData.projects || []).map(p => ({
          project_name: p.project_name || '',
          client: p.client || '',
          role: (p as any).role || '',
          task_description: p.task_description || ''
        }))
      });
    } else {
      setFormData({
        week: getDefaultWeek(),
        occupancy: 0,
        projects: []
      });
    }
  }, [initialData, isOpen]);

  const mutation = useMutation({
    mutationFn: async (updateData: WeeklyUpdateApiCreate) => {
      if (initialData) {
        return weeklyUpdateService.updateUpdate(initialData.id, updateData);
      }
      return weeklyUpdateService.createUpdate(updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-updates'] });
      showToast(initialData ? 'Update updated successfully!' : 'Update posted successfully!', 'success');
      onClose();
      // Reset form
      setFormData({
        week: getDefaultWeek(),
        occupancy: 0,
        projects: []
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || 'An error occurred';
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
        showToast('A weekly update for this project and date already exists.', 'duplicate');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  });

  const handleToggleProjectSelection = (proj: ActiveProject) => {
    const isSelected = formData.projects.some(
      p => p.project_name.toLowerCase() === proj.title.toLowerCase()
    );

    if (isSelected) {
      // Deselect
      const newProjects = formData.projects.filter(
        p => p.project_name.toLowerCase() !== proj.title.toLowerCase()
      );
      const newOccupancy = Math.max(0, formData.occupancy - proj.occupancy);
      setFormData({
        ...formData,
        occupancy: newOccupancy,
        projects: newProjects
      });
    } else {
      // Select
      const newProjects = [
        ...formData.projects,
        {
          project_name: proj.title,
          client: proj.client || '',
          role: proj.role || '',
          task_description: ''
        }
      ];
      const newOccupancy = Math.min(100, formData.occupancy + proj.occupancy);
      setFormData({
        ...formData,
        occupancy: newOccupancy,
        projects: newProjects
      });
    }
  };

  const updateProject = (index: number, field: 'task_description', value: string) => {
    const newProjects = [...formData.projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    setFormData({ ...formData, projects: newProjects });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.username) return;

    if (formData.projects.length === 0) {
      showToast('Please select at least one active project to write a weekly update.', 'error');
      return;
    }

    const weekEndDate = getFridayFromWeek(formData.week);
    const updateData: WeeklyUpdateApiCreate = {
      username: user.username,
      name: user.name,
      role: formData.projects[0]?.role || userDetail?.role || '',
      week_end_date: weekEndDate,
      occupancy: formData.occupancy,
      projects: formData.projects
    };

    mutation.mutate(updateData);
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
            className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-8 border-b border-outline-variant/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-on-surface">
                  {initialData ? 'Edit Weekly Update' : 'Weekly Status Update'}
                </h3>
                <p className="text-on-surface-variant text-sm font-medium mt-1">
                  {initialData ? 'Update your progress and project details.' : 'Share your progress and project details for the week.'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Occupancy (%)</label>
                  <div className="relative group">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within/field:text-primary transition-colors" size={18} />
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      required
                      placeholder="100"
                      value={formData.occupancy}
                      onChange={(e) => setFormData({ ...formData, occupancy: parseInt(e.target.value) || 0 })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Select Week</label>
                  <div className="relative group">
                    <label className="relative block cursor-pointer">
                      <div className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium text-left flex items-center group-hover:bg-surface-container transition-colors">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-hover:text-primary transition-colors pointer-events-none" size={18} />
                        <span>{getWeekLabel(formData.week)}</span>
                      </div>
                      <input 
                        type="week"
                        required
                        value={formData.week}
                        onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                        onClick={(e) => {
                          try {
                            (e.target as any).showPicker();
                          } catch (err) {
                            // Fallback
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Active Projects Selection Section */}
              <div className="space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 px-1">
                  Select Active Projects to Update
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {normalizeProjects(userDetail?.active_projects || [])
                    .filter(p => p.is_active)
                    .map((proj) => {
                      const isSelected = formData.projects.some(
                        p => p.project_name.toLowerCase() === proj.title.toLowerCase()
                      );
                      return (
                        <button
                          key={proj.title}
                          type="button"
                          onClick={() => handleToggleProjectSelection(proj)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-primary text-on-primary border-primary shadow-sm shadow-primary/20 scale-[1.02]'
                              : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border-outline-variant/10'
                          }`}
                        >
                          <span className="font-mono text-sm">{isSelected ? '✓' : '+'}</span>
                          <span>{proj.title}</span>
                          {proj.client && (
                            <span className={`text-[10px] ${isSelected ? 'text-on-primary/75' : 'text-on-surface-variant/50'}`}>
                              ({proj.client})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  {(!userDetail?.active_projects || userDetail.active_projects.length === 0) && (
                    <div className="text-xs text-on-surface-variant/50 italic py-1 px-1">
                      No active projects found in your profile. Please add projects to your profile portfolio first.
                    </div>
                  )}
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Project Updates</h4>
                </div>

                <div className="space-y-4">
                  {formData.projects.map((project, index) => (
                    <motion.div 
                      layout
                      key={project.project_name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-surface-container-low/35 p-6 rounded-3xl border border-outline-variant/10 relative group"
                    >
                      <button 
                        type="button"
                        onClick={() => {
                          const match = normalizeProjects(userDetail?.active_projects || []).find(
                            p => p.title.toLowerCase() === project.project_name.toLowerCase()
                          );
                          if (match) {
                            handleToggleProjectSelection(match);
                          } else {
                            const newProjects = formData.projects.filter((_, i) => i !== index);
                            setFormData({ ...formData, projects: newProjects });
                          }
                        }}
                        className="absolute top-4 right-4 p-2 text-on-surface-variant/30 hover:text-error hover:bg-error/5 rounded-xl transition-all"
                        title="Remove Project Update"
                      >
                        <X size={18} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Project Name</label>
                          <div className="relative group/field bg-surface-container-low/55 rounded-2xl border border-outline-variant/10">
                            <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30" size={18} />
                            <input 
                              type="text"
                              disabled
                              value={project.project_name}
                              className="w-full bg-transparent border-none pl-12 pr-4 py-3 text-sm font-semibold text-on-surface-variant/60 cursor-not-allowed outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Client</label>
                          <div className="relative group/field bg-surface-container-low/55 rounded-2xl border border-outline-variant/10">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30" size={18} />
                            <input 
                              type="text"
                              disabled
                              value={project.client}
                              className="w-full bg-transparent border-none pl-12 pr-4 py-3 text-sm font-semibold text-on-surface-variant/60 cursor-not-allowed outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Role</label>
                          <div className="relative group/field bg-surface-container-low/55 rounded-2xl border border-outline-variant/10">
                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30" size={18} />
                            <input 
                              type="text"
                              disabled
                              value={project.role}
                              className="w-full bg-transparent border-none pl-12 pr-4 py-3 text-sm font-semibold text-on-surface-variant/60 cursor-not-allowed outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Task Description</label>
                        <RichTextEditor 
                          value={project.task_description} 
                          onChange={(val) => updateProject(index, 'task_description', val)}
                          placeholder="What did you work on for this project?"
                        />
                      </div>
                    </motion.div>
                  ))}
                  {formData.projects.length === 0 && (
                    <div className="text-center py-10 bg-surface-container-low/10 border border-dashed border-outline-variant/20 rounded-3xl text-on-surface-variant/40 italic text-sm font-medium">
                      Select one or more active projects from the list above to write their weekly achievements.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-outline-variant/5 shrink-0">
                <button 
                  type="button"
                  disabled={mutation.isPending}
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-2xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={mutation.isPending}
                  className="primary-gradient text-on-primary px-10 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center gap-2 disabled:opacity-50"
                >
                  {mutation.isPending && <Loader2 className="animate-spin" size={16} />}
                  <span>{mutation.isPending ? (initialData ? 'Updating...' : 'Posting...') : (initialData ? 'Update Weekly Update' : 'Post Weekly Update')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
