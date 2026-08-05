import React from 'react';
import { X, ExternalLink, Calendar, User, Tag, CheckCircle, XCircle, Clock, Link as LinkIcon, MessageSquare, Image as ImageIcon, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onReview: (id: string, status: 'Approved' | 'Rejected') => void;
  onSubmitProof: (task: Task) => void;
  getStatusColor: (status: TaskStatus) => string;
  getTagColor: (tag: string) => string;
}

export default function TaskDetailModal({ 
  isOpen, 
  onClose, 
  task, 
  onReview, 
  onSubmitProof,
  getStatusColor,
  getTagColor
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const isOwner = user?.username === task.username;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-surface rounded-[2rem] w-full max-w-lg max-h-[90vh] relative shadow-2xl overflow-hidden border border-outline-variant/10 flex flex-col"
          >
            {/* Header / Status Banner */}
            <div className={`shrink-0 h-12 flex items-center justify-between px-5 ${task.status === 'Approved' ? 'bg-success/5' : task.status === 'Rejected' ? 'bg-error/5' : 'bg-primary/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${getStatusColor(task.status)}`}>
                  {task.status}
                </div>
                {task.status === 'Submitted' && (
                  <span className="text-[9px] font-bold text-primary animate-pulse uppercase tracking-wider">Needs Review</span>
                )}
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-surface-container rounded-lg transition-all text-on-surface-variant/60 hover:text-on-surface"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-surface relative z-10 space-y-4 custom-scrollbar min-h-0">
              {/* Title & Description */}
              <div className="space-y-3">
                <h2 className="text-xl font-black text-on-surface tracking-tight leading-loose">
                  {task.title}
                </h2>
                {task.description && (
                  <div className="text-xs text-on-surface-variant font-medium leading-relaxed bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/10 prose prose-sm max-w-none prose-primary prose-p:my-1 prose-headings:text-on-surface prose-headings:font-black prose-headings:mt-2 prose-headings:mb-1">
                    <ReactMarkdown>{task.description}</ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                {task.tags.map(tag => (
                  <div 
                    key={tag} 
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-colors shadow-sm ${getTagColor(tag)}`}
                  >
                    <Tag size={8} />
                    <span>{tag}</span>
                  </div>
                ))}
              </div>

              {/* Metadata Cluster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-0.5">
                <div className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 bg-surface-container-high rounded-lg flex items-center justify-center text-on-surface-variant/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em]">Logged By</p>
                    <p className="text-[11px] font-bold text-on-surface mt-0.5">{task.created_by}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 bg-surface-container-high rounded-lg flex items-center justify-center text-on-surface-variant/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em]">Logged On</p>
                    <p className="text-[11px] font-bold text-on-surface mt-0.5">{new Date(task.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 bg-surface-container-high rounded-lg flex items-center justify-center text-on-surface-variant/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <LinkIcon size={16} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em]">Platform</p>
                    {task.problem_url ? (
                      <a 
                        href={task.problem_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        View Link
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <p className="text-[11px] font-bold text-on-surface-variant/40 mt-0.5">--</p>
                    )}
                  </div>
                </div>

                {task.submitted_at && (
                  <div className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 bg-surface-container-high rounded-lg flex items-center justify-center text-on-surface-variant/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em]">Submitted At</p>
                      <p className="text-[11px] font-bold text-on-surface mt-0.5">{new Date(task.submitted_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Proof Details if submitted */}
              {(task.screenshot_url || task.submission_notes || (task.links && task.links.length > 0)) && (
                <div className="space-y-3 pt-3 border-t border-outline-variant/10">
                  <div className="flex items-center gap-2 text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.15em]">
                    <ImageIcon size={12} /> Submission Evidence
                  </div>
                  
                  {task.screenshot_url && (
                    <div className="relative group rounded-xl overflow-hidden border border-outline-variant/20 shadow-inner">
                      <img 
                        src={task.screenshot_url} 
                        alt="Task Proof" 
                        className="w-full max-h-[180px] object-cover"
                      />
                      <a 
                        href={task.screenshot_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-on-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                         <div className="bg-surface px-3 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1.5 shadow-xl">
                           <ExternalLink size={12} /> Full Image
                         </div>
                      </a>
                    </div>
                  )}

                  {task.links && task.links.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold text-on-surface-variant">Reference Links</p>
                      <div className="flex gap-2">
                        {task.links.map((link, idx) => (
                          <a 
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/5 hover:border-primary/20 transition-all group/link"
                          >
                            <span className="text-[11px] font-bold text-on-surface truncate pr-4">{link.name || link.url}</span>
                            <ExternalLink size={10} className="text-on-surface-variant/40 group-hover/link:text-primary transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.submission_notes && (
                    <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/5">
                      <p className="text-[9px] font-bold text-on-surface-variant mb-0.5">Notes</p>
                      <p className="text-[11px] text-on-surface font-medium leading-relaxed">{task.submission_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Review Comments */}
              {task.review_comments && (
                <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/5 space-y-0.5">
                  <div className="flex items-center gap-2 text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.15em]">
                    <MessageSquare size={12} /> Feedback
                  </div>
                  <p className="text-[11px] text-on-surface font-bold leading-relaxed italic">"{task.review_comments}"</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-surface border-t border-outline-variant/10 flex-shrink-0">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                {user?.admin && task.status === 'Submitted' && (
                  <>
                    <button 
                      onClick={() => onReview(task.id, 'Approved')}
                      className="w-full sm:w-auto px-8 py-2.5 bg-success text-on-success rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-success/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>
                    <button 
                      onClick={() => onReview(task.id, 'Rejected')}
                      className="w-full sm:w-auto px-4 py-2.5 bg-surface-container-high text-error rounded-xl font-bold text-[10px] tracking-wide hover:bg-error/10 transition-all border border-error/10"
                    >
                      Reject
                    </button>
                  </>
                )}

                {isOwner && task.status === 'Pending' && (
                  <button 
                    onClick={() => onSubmitProof(task)}
                    className="w-full primary-gradient text-on-primary py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Upload size={14} />
                    Submit Evidence
                  </button>
                )}

                <button 
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 font-bold text-[10px] text-on-surface-variant hover:bg-surface-container rounded-xl transition-all ml-auto uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
