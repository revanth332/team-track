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
            <div className="p-5 sm:p-8 border-b border-outline-variant/10 flex items-start sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm shrink-0 mt-0.5 sm:mt-0">
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
                  <h3 className="text-lg sm:text-xl font-bold text-on-surface leading-snug">{update.name || update.username}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mt-1.5 sm:mt-2">
                    <div className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant font-medium bg-surface-container-low px-2.5 py-0.5 sm:py-1 rounded-lg">
                      <UserCircle size={14} className="text-on-surface-variant/70" />
                      <span>{update.role}</span>
                    </div>
                    {update.occupancy !== undefined && (
                      <div className="inline-flex items-center gap-1 text-xs text-primary font-bold bg-primary/10 px-2.5 py-0.5 sm:py-1 rounded-lg">
                        <Percent size={13} className="text-primary/70" />
                        <span>{update.occupancy}% Occupancy</span>
                      </div>
                    )}
                    {update.seen_by_lead ? (
                      <div className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-100 font-bold px-2.5 py-0.5 sm:py-1 rounded-lg">
                        <CheckCheck size={14} />
                        <span>Seen By Lead</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-xs text-primary font-bold bg-primary/10 px-2.5 py-0.5 sm:py-1 rounded-lg">
                        <Check size={14} />
                        <span>Update Sent</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8">
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 px-1">
                  <Layout size={16} className="text-primary" />
                  Projects & Achievements
                </h4>
                
                <div className="space-y-6">
                  {update.projects.map((project, index) => (
                    <div key={index} className="bg-surface-container-low/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-outline-variant/5">
                        <div className="flex items-center gap-2">
                          <Layout size={18} className="text-primary shrink-0" />
                          <h5 className="font-bold text-on-surface text-sm sm:text-base break-words">{project.project_name}</h5>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          {project.role && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              <UserCircle size={12} className="text-on-surface-variant/70" />
                              <span>{project.role}</span>
                            </div>
                          )}
                          {project.client && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              <Briefcase size={12} />
                              <span>{project.client}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 block mb-1">Key Contributions / Work Done</span>
                          <div 
                            className="prose prose-sm max-w-none text-on-surface-variant font-medium leading-relaxed markdown-body"
                            dangerouslySetInnerHTML={{ __html: project.task_description }}
                          />
                        </div>

                        {project.remarks_risks_dependencies && (
                          <div className="pt-2 border-t border-outline-variant/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 block mb-1">Remarks / Risks / Dependencies</span>
                            <p className="text-xs text-on-surface-variant font-medium whitespace-pre-wrap">{project.remarks_risks_dependencies}</p>
                          </div>
                        )}

                        {project.accomplishments_highlights && (
                          <div className="pt-2 border-t border-outline-variant/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 block mb-1">Accomplishments / Highlights</span>
                            <p className="text-xs text-on-surface-variant font-medium whitespace-pre-wrap">{project.accomplishments_highlights}</p>
                          </div>
                        )}

                        {project.business_impact && (
                          <div className="pt-2 border-t border-outline-variant/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 block mb-1">Business Impact</span>
                            <p className="text-xs text-on-surface-variant font-medium whitespace-pre-wrap">{project.business_impact}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-surface-container-lowest border-t border-outline-variant/10 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 shrink-0">
              <div>
                {user?.admin && onSeen && (
                  <button 
                    onClick={() => onSeen(update.id)}
                    disabled={update.seen_by_lead || isSeenPending}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
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
                className="w-full sm:w-auto px-8 py-3 bg-surface-container-low text-on-surface-variant font-bold text-sm rounded-2xl hover:bg-surface-container transition-colors"
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
