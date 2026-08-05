import React from 'react';
import { X, Briefcase, Layout, UserCircle, Percent, Check, CheckCheck, ThumbsUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WeeklyUpdateApi } from '../../types';
import { getProfileImage } from '../../utils/userUtils';
import { useAuth } from '../../context/AuthContext';

interface WeeklyUpdateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  update: WeeklyUpdateApi | null;
  onSeen?: (id: string) => void;
  isSeenPending?: boolean;
}

export default function WeeklyUpdateDetailModal({ 
  isOpen, 
  onClose, 
  update,
  onSeen,
  isSeenPending
}: WeeklyUpdateDetailModalProps) {
  const { user } = useAuth();
  if (!update) return null;

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
            <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                  {update.username ? (
                    <img 
                      src={getProfileImage(update.username)} 
                      alt={update.name || update.username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{(update.name || update.username || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">{update.name || update.username}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <UserCircle size={14} className="opacity-40" />
                      <span>{update.role}</span>
                    </div>
                    {update.occupancy !== undefined && (
                      <>
                        <div className="w-1 h-1 rounded-full bg-outline-variant/40" />
                        <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                          <Percent size={14} className="opacity-60" />
                          <span>{update.occupancy}% Occupancy</span>
                        </div>
                      </>
                    )}
                    {update.seen_by_lead ? (
                      <>
                        <div className="w-1 h-1 rounded-full bg-outline-variant/40" />
                        <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                          <CheckCheck size={14} />
                          <span>Seen By Lead</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-1 h-1 rounded-full bg-outline-variant/40" />
                        <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                          <Check size={14} />
                          <span>Update Sent</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 px-1">
                  <Layout size={16} className="text-primary" />
                  Projects & Achievements
                </h4>
                
                <div className="space-y-6">
                  {update.projects.map((project, index) => (
                    <div key={index} className="bg-surface-container-low/30 p-6 rounded-3xl border border-outline-variant/10">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-outline-variant/5">
                        <div className="flex items-center gap-2">
                          <Layout size={18} className="text-primary" />
                          <h5 className="font-bold text-on-surface">{project.project_name}</h5>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                          <Briefcase size={12} />
                          <span>{project.client}</span>
                        </div>
                      </div>
                      <div 
                        className="prose prose-sm max-w-none text-on-surface-variant font-medium leading-relaxed markdown-body"
                        dangerouslySetInnerHTML={{ __html: project.task_description }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/10 flex justify-between items-center shrink-0">
              <div>
                {user?.admin && onSeen && (
                  <button 
                    onClick={() => onSeen(update.id)}
                    disabled={update.seen_by_lead || isSeenPending}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                      update.seen_by_lead 
                        ? 'bg-primary/10 text-primary cursor-default' 
                        : 'primary-gradient text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100'
                    }`}
                  >
                    {isSeenPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ThumbsUp size={18} className={update.seen_by_lead ? 'fill-primary' : ''} />
                    )}
                    <span>{update.seen_by_lead ? 'Verified by Lead' : 'Mark as Seen'}</span>
                  </button>
                )}
              </div>
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-surface-container-low text-on-surface-variant font-bold text-sm rounded-2xl hover:bg-surface-container transition-colors"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
