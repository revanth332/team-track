import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Upload, Send, MessageSquare, Image as ImageIcon, CheckCircle2, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Task, TaskSubmission, GoalLink } from '../../types';

interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

export default function TaskSubmissionModal({ isOpen, onClose, task }: TaskSubmissionModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<TaskSubmission>({
    screenshot_url: '',
    links: [],
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        screenshot_url: '',
        links: [],
        notes: '',
      });
    }
  }, [isOpen, task?.id]);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      showToast('Cloudinary is not configured. Please check your variables in the Settings menu.', 'error');
      return;
    }

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: uploadData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, screenshot_url: data.secure_url }));
      showToast('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    } else if (file) {
      showToast('Only image files are allowed', 'error');
    }
  };

  const submitMutation = useMutation({
    mutationFn: (data: TaskSubmission) => {
      if (!task) throw new Error('Task is missing');
      return taskService.submitTask(task.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task submitted successfully!', 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to submit task', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.screenshot_url && (!formData.links || formData.links.length === 0)) {
      showToast('Please upload a screenshot or provide at least one link as proof', 'error');
      return;
    }
    submitMutation.mutate(formData);
  };

  const addLink = () => {
    setFormData(prev => ({
      ...prev,
      links: [...(prev.links || []), { name: '', url: '' }]
    }));
  };

  const updateLink = (index: number, field: keyof GoalLink, value: string) => {
    setFormData(prev => {
      const newLinks = [...(prev.links || [])];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, links: newLinks };
    });
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index)
    }));
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
            className="bg-surface rounded-[2rem] w-full max-w-lg max-h-[90vh] relative shadow-2xl flex flex-col overflow-hidden border border-outline-variant/10"
          >
            <div className="flex items-center justify-between p-8 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">Submit Proof</h3>
                  <p className="text-xs text-on-surface-variant font-medium opacity-60">
                    Submit your completion evidence for "{task?.title || 'this task'}"
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-8 space-y-6 custom-scrollbar pb-2">
                <div className="space-y-4">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">Completion Screenshot</span>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  {!formData.screenshot_url ? (
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
                        ${isUploading ? 'border-primary/50 bg-primary/5' : 'border-outline-variant/20 hover:border-primary/50 hover:bg-surface-container-low'}
                      `}
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin text-primary" size={32} />
                      ) : (
                        <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant/40">
                          <Upload size={24} />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-sm font-bold text-on-surface">
                          {isUploading ? 'Uploading screenshot...' : 'Click or drag screenshot here'}
                        </p>
                        <p className="text-[10px] text-on-surface-variant mt-1">PNG, JPG, or WEBP up to 10MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-outline-variant/20 aspect-video group">
                      <img 
                        src={formData.screenshot_url} 
                        alt="Proof" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-on-surface/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, screenshot_url: '' }))}
                          className="p-3 bg-error text-on-error rounded-xl shadow-lg hover:scale-110 transition-transform"
                        >
                          <Trash2 size={20} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 bg-primary text-on-primary rounded-xl shadow-lg hover:scale-110 transition-transform"
                        >
                          <Upload size={20} />
                        </button>
                      </div>
                      <div className="absolute top-3 left-3 bg-success text-on-success px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                        <CheckCircle2 size={12} />
                        <span>Ready to Submit</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block flex items-center gap-2">
                      <LinkIcon size={14} /> Submission Links
                    </span>
                    <button
                      type="button"
                      onClick={addLink}
                      className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Link
                    </button>
                  </div>
                  
                  {formData.links && formData.links.length > 0 ? (
                    <div className="space-y-3">
                      {formData.links.map((link, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={link.name}
                              onChange={e => updateLink(index, 'name', e.target.value)}
                              placeholder="Link Title (e.g. Doc Url)"
                              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                            />
                            <input
                              type="url"
                              value={link.url}
                              onChange={e => updateLink(index, 'url', e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="p-2.5 text-on-surface-variant/40 hover:text-error transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-surface-container-low/30 rounded-2xl border-2 border-dashed border-outline-variant/10">
                      <p className="text-[10px] font-medium text-on-surface-variant/40 italic">
                        No links added yet. You can either upload a screenshot OR provide links.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block flex items-center gap-2">
                      <MessageSquare size={14} /> Additional Notes (Optional)
                    </span>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium min-h-[100px] placeholder:text-on-surface-variant/30"
                      placeholder="Mention anything specific to your submission..."
                    />
                  </label>
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
                  disabled={submitMutation.isPending || isUploading}
                  className="primary-gradient text-on-primary px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                >
                  {submitMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  <span>Submit Task</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
