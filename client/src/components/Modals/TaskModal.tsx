import React, { useState, useEffect } from 'react';
import { X, Loader2, Tag, Calendar, User, Layout, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService, teamService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Task, TaskCreate, TaskUpdate } from '../../types';
import RichTextEditor from '../Editor/RichTextEditor';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
}

export default function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState<TaskCreate>({
    title: '',
    problem_url: '',
    description: '',
    tags: [],
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        problem_url: task.problem_url || '',
        description: task.description || '',
        tags: task.tags,
      });
    } else {
      setFormData({
        title: '',
        problem_url: '',
        description: '',
        tags: [],
      });
    }
  }, [task, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: TaskCreate) => taskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task logged successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to log task', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: TaskUpdate) => taskService.updateTask(task!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task updated successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update task', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="bg-surface rounded-[2rem] w-full max-w-2xl relative shadow-2xl flex flex-col max-h-[90vh] border border-outline-variant/10 overflow-hidden"
          >
            <div className="flex items-center justify-between p-8 pb-0 mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Layout size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">{task ? 'Edit Task' : 'Log New Task'}</h3>
                  <p className="text-xs text-on-surface-variant font-medium opacity-60">
                    {task ? 'Update details of your task' : 'Keep track of your task achievements'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                  <div className="space-y-4 md:col-span-2">
                    <label className="block">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Task Title</span>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium placeholder:text-on-surface-variant/30"
                        placeholder="e.g. Completed HackerRank SQL Certification"
                      />
                    </label>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <label className="block">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Task URL (Optional)</span>
                      <div className="relative">
                        <input
                          type="url"
                          value={formData.problem_url}
                          onChange={e => setFormData({ ...formData, problem_url: e.target.value })}
                          className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-3 pl-12 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium placeholder:text-on-surface-variant/30"
                          placeholder="https://hackerrank.com/..."
                        />
                        <ExternalLink size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <label className="block">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Description (Optional)</span>
                      <RichTextEditor
                        content={formData.description || ''}
                        onChange={content => setFormData({ ...formData, description: content })}
                        placeholder="Add more details about the achievement..."
                      />
                    </label>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <label className="block">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <Tag size={14} /> Tags
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          className="flex-1 bg-surface-container-low border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                          placeholder="Add tag (e.g. Python)"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          className="bg-primary/10 text-primary px-5 rounded-2xl font-bold text-sm hover:bg-primary/20 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.tags.map(tag => (
                          <span key={tag} className="bg-surface-container-high px-3 py-1.5 rounded-xl text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-error">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-8 border-t border-outline-variant/10 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="primary-gradient text-on-primary px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={18} className="animate-spin" />}
                  <span>{task ? 'Update Task' : 'Log Task'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
