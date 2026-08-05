import React from 'react';
import { X, Lightbulb, Link as LinkIcon, Info, Edit2, Trash2, CheckCircle2, Calendar, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Idea } from '../../types';
import { getProfileImage } from '../../utils/userUtils';
import ReactMarkdown from 'react-markdown';

interface IdeaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: Idea | null;
  onEdit: (idea: Idea) => void;
  onDelete?: (idea: Idea) => void;
  isAdmin?: boolean;
  allowEdit?:boolean
}

export default function IdeaDetailModal({ isOpen, onClose, idea, onEdit, onDelete, isAdmin,allowEdit }: IdeaDetailModalProps) {
  if (!idea) return null;

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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  idea.status === 'Approved' ? 'bg-green-500/10 text-green-600' : 
                  idea.status === 'Rejected' ? 'bg-error/10 text-error' : 
                  'bg-amber-500/10 text-amber-600'
                }`}>
                  {idea.status === 'Approved' ? <CheckCircle2 size={24} /> : <Lightbulb size={24} />}
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-on-surface">{idea.title}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-primary relative">
                        {idea.username ? (
                          <img 
                            src={getProfileImage(idea.username)} 
                            alt={idea.username}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="absolute inset-0 flex items-center justify-center -z-10">
                          {(idea.added_by || idea.username || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-on-surface-variant">{idea.added_by || idea.username || 'Anonymous'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-on-surface-variant/40">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {new Date(idea.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {allowEdit && <button 
                  onClick={() => onEdit(idea)}
                  className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                  title="Edit Idea"
                >
                  <Edit2 size={20} />
                </button>}
                {isAdmin && onDelete && (
                  <button 
                    onClick={() => onDelete(idea)}
                    className="p-2 rounded-xl hover:bg-error/10 text-error transition-colors"
                    title="Delete Idea"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Status Badge */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Status:</span>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    idea.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                    idea.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {idea.status}
                  </span>
                </div>

                {idea.tags && idea.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Tags:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {idea.tags.map(tag => (
                        <div key={tag} className="flex items-center gap-1.5 px-2 py-1 bg-surface-container-low text-on-surface text-[10px] font-bold rounded-lg border border-outline-variant/10">
                          <Tag size={12} className="text-primary opacity-60" />
                          <span className="uppercase tracking-tight">{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
                  <Info size={12} />
                  Description
                </h5>
                <div className="text-sm font-medium text-on-surface-variant leading-relaxed bg-surface-container-low/30 p-6 rounded-2xl prose prose-sm max-w-none prose-primary">
                  <ReactMarkdown>{idea.description}</ReactMarkdown>
                </div>
              </div>

              {/* Links */}
              {idea.links && idea.links.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Reference Links</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {idea.links.map((link, i) => (
                      <a 
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-surface-container-low/50 rounded-xl hover:bg-primary/5 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary transition-colors">
                          <LinkIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">Resource {i + 1}</p>
                          <p className="text-[10px] text-on-surface-variant/60 truncate">{link}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
