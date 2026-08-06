import React, { useState, useEffect } from 'react';
import { X, Lightbulb, FileText, Link as LinkIcon, Loader2, Trash2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ideaService } from '../../services/api';
import { Idea, IdeaCreate } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ReactMarkdown from 'react-markdown';
import RichTextEditor from '../Editor/RichTextEditor';

interface IdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaToEdit?: Idea | null;
}

export default function IdeaModal({ isOpen, onClose, ideaToEdit }: IdeaModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<IdeaCreate>({
    username: '', 
    added_by: '',
    title: '',
    description: '',
    links: [],
    status: 'Pending',
    blog_assignee: null,
    video_assignee: null,
    tags: [],
    year: new Date().getFullYear(),
    quarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
  });

  useEffect(() => {
    if (ideaToEdit) {
      setFormData({
        username: ideaToEdit.username,
        added_by: ideaToEdit.added_by || '',
        title: ideaToEdit.title,
        description: ideaToEdit.description,
        links: ideaToEdit.links,
        status: ideaToEdit.status,
        blog_assignee: ideaToEdit.blog_assignee || null,
        video_assignee: ideaToEdit.video_assignee || null,
        tags: ideaToEdit.tags || [],
        year: ideaToEdit.year,
        quarter: ideaToEdit.quarter,
      });
    } else {
      setFormData({
        username: user?.username || '',
        added_by: user?.name || '',
        title: '',
        description: '',
        links: [],
        status: 'Pending',
        blog_assignee: null,
        video_assignee: null,
        tags: [],
        year: new Date().getFullYear(),
        quarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      });
    }
  }, [ideaToEdit, isOpen, user]);

  const createMutation = useMutation({
    mutationFn: ideaService.createIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      showToast('Idea created successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create idea', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: IdeaCreate) => ideaService.updateIdea(ideaToEdit!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      showToast('Idea updated successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update idea', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ideaToEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const addLink = () => {
    setFormData(prev => ({ ...prev, links: [...prev.links, ''] }));
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...formData.links];
    newLinks[index] = value;
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
                  <Lightbulb size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-on-surface">
                    {ideaToEdit ? 'Edit Idea' : 'Submit New Idea'}
                  </h3>
                  <p className="text-on-surface-variant text-sm font-medium mt-1">
                    {ideaToEdit ? 'Refine your proposal for the quarterly goals.' : 'Pitch a new project or initiative to the team.'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Added By</label>
                  <p className="text-sm font-bold text-primary px-1">{formData.added_by || user?.name || 'Anonymous'}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Status</label>
                  <p className={`text-sm font-bold px-1 capitalize ${
                    formData.status === 'Approved' ? 'text-green-600' : 
                    formData.status === 'Rejected' ? 'text-error' : 
                    'text-amber-600'
                  }`}>
                    {formData.status}
                  </p>
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
                      placeholder="e.g. System Design Crash Course Video"
                      className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Description</label>
                  <RichTextEditor 
                    content={formData.description}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Explain the core concept, impact, and requirements..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 px-1">Tags</label>
                  <div className="flex gap-3">
                    {['blog', 'video'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = formData.tags || [];
                          const isSelected = currentTags.includes(tag);
                          const newTags = isSelected
                            ? currentTags.filter(t => t !== tag)
                            : [...currentTags, tag];
                          setFormData({ ...formData, tags: newTags });
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          formData.tags?.includes(tag)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface-container-low border-outline-variant/10 text-on-surface-variant/60 hover:border-primary/30'
                        }`}
                      >
                        <Tag size={14} />
                        <span className="capitalize">{tag}</span>
                        {formData.tags?.includes(tag) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
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
                      <div className="relative flex-1 group">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={14} />
                        <input 
                          type="url" 
                          value={link}
                          onChange={(e) => updateLink(index, e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-surface-container-low/50 border-none rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
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
                  <span>{isPending ? 'Saving...' : (ideaToEdit ? 'Update Idea' : 'Submit Idea')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
