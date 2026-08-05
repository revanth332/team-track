import React, { useState, useEffect } from 'react';
import { X, Target, FileText, Link as LinkIcon, Loader2, Trash2, User, Calendar, BookOpen, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalService, teamService } from '../../services/api';
import { QuarterlyGoal, QuarterlyGoalCreate, TeamMember } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import RichTextEditor from '../Editor/RichTextEditor';

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: QuarterlyGoal | null;
}

export default function AddGoalModal({ isOpen, onClose, goalToEdit }: AddGoalModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<QuarterlyGoalCreate>({
    assignee: '',
    assignee_username: '',
    title: '',
    description: '',
    links: [],
    type: 'blog',
    status: 'Pending',
    progress: 0,
    idea_id: '',
    year: new Date().getFullYear(),
    quarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => teamService.getMembers(),
  });

  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        assignee: goalToEdit.assignee,
        assignee_username: goalToEdit.assignee_username || '',
        title: goalToEdit.title,
        description: goalToEdit.description,
        links: goalToEdit.links,
        type: goalToEdit.type,
        status: goalToEdit.status,
        progress: goalToEdit.progress,
        idea_id: goalToEdit.idea_id || '',
        year: goalToEdit.year,
        quarter: goalToEdit.quarter,
      });
    } else {
      setFormData({
        assignee: user?.name || '',
        assignee_username: user?.username || '',
        title: '',
        description: '',
        links: [],
        type: 'blog',
        status: 'Pending',
        progress: 0,
        idea_id: '',
        year: new Date().getFullYear(),
        quarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      });
    }
  }, [goalToEdit, isOpen, user]);

  const createMutation = useMutation({
    mutationFn: goalService.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      showToast('Goal created successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create goal', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: QuarterlyGoalCreate) => goalService.updateGoal(goalToEdit!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      showToast('Goal updated successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update goal', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (goalToEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const addLink = () => {
    setFormData(prev => ({ ...prev, links: [...prev.links, { name: '', url: '' }] }));
  };

  const updateLink = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...formData.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData(prev => ({ ...prev, links: newLinks }));
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-on-surface">
                    {goalToEdit ? 'Edit Goal' : 'Create New Goal'}
                  </h3>
                  <p className="text-on-surface-variant text-sm font-medium mt-1">
                    {goalToEdit ? 'Update the details of this quarterly objective.' : 'Set a new target for the team this quarter.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Assignee</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <select 
                      required
                      value={formData.assignee_username}
                      onChange={(e) => {
                        const member = members?.find(m => m.username === e.target.value);
                        setFormData({ 
                          ...formData, 
                          assignee_username: e.target.value,
                          assignee: member?.name || ''
                        });
                      }}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium appearance-none"
                    >
                      <option value="">Select Assignee</option>
                      {members?.map(member => (
                        <option key={member.id} value={member.username}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Goal Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'blog' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                        formData.type === 'blog' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <BookOpen size={18} />
                      <span>Blog</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'video' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                        formData.type === 'video' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      <Video size={18} />
                      <span>Video</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Quarter</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <select 
                      required
                      value={formData.quarter}
                      onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium appearance-none"
                    >
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Year</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="number" 
                      required
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Title</label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Advanced React Patterns Guide"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Description</label>
                  <RichTextEditor 
                    content={formData.description}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Provide a detailed breakdown of the goal objectives..."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Reference Links</label>
                    <button 
                      type="button"
                      onClick={addLink}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      + Add Link
                    </button>
                  </div>
                  {formData.links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={link.name}
                          onChange={(e) => updateLink(index, 'name', e.target.value)}
                          placeholder="Link Name"
                          className="w-full bg-surface-container-low/50 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                        />
                        <input 
                          type="url" 
                          value={link.url}
                          onChange={(e) => updateLink(index, 'url', e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-surface-container-low/50 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                        />
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeLink(index)}
                        className="p-2 text-on-surface-variant/40 hover:text-error transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
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
                  className="primary-gradient text-on-primary px-10 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-70 flex items-center gap-2"
                >
                  {isPending && <Loader2 size={18} className="animate-spin" />}
                  <span>{isPending ? 'Saving...' : (goalToEdit ? 'Update Goal' : 'Create Goal')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
