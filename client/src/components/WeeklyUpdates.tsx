import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Calendar, Plus, Edit, Hand, Briefcase, Layout, Percent, Loader2, AlertCircle, Trash2, ThumbsUp, Check, CheckCheck, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilter } from '../context/FilterContext';
import { weeklyUpdateService } from '../services/api';
import { getProfileImage } from '../utils/userUtils';
import { getWeekString, getMondayFromWeek, getFridayFromWeek, getDefaultWeek, getWeekLabel } from '../utils/dateUtils';
import { formatWeeklyUpdatesToText, formatBiweeklyUpdatesToText, getPreviousWeekString } from '../utils/exportUtils';
import { WeeklyUpdateApi } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from './ui/Skeleton';

import WeeklyAchievementModal from './Modals/WeeklyAchievementModal';
import WeeklyUpdateDetailModal from './Modals/WeeklyUpdateDetailModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import ExportPreviewModal from './Modals/ExportPreviewModal';

interface WeeklyUpdatesProps {
  onAddUpdate: () => void;
}

export default function WeeklyUpdates({ onAddUpdate }: WeeklyUpdatesProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<WeeklyUpdateApi | null>(null);
  const [updateToDelete, setUpdateToDelete] = useState<WeeklyUpdateApi | null>(null);
  const { selectedAssignee } = useFilter();
  const [filters, setFilters] = useState({
    week: getDefaultWeek()
  });

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState<{
    title: string;
    subtitle: string;
    formattedText: string;
  }>({ title: '', subtitle: '', formattedText: '' });

  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const weekEndDate = getFridayFromWeek(filters.week);

  const { data: updates, isLoading, isError } = useQuery({
    queryKey: ['weekly-updates', { week_end_date: weekEndDate, name: selectedAssignee?.name }],
    queryFn: () => weeklyUpdateService.getUpdates({ week_end_date: weekEndDate, name: selectedAssignee?.name || undefined }),
  });

  const updatesToDisplay = updates || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => weeklyUpdateService.deleteUpdate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-updates'] });
      showToast('Weekly update deleted successfully!', 'success');
      setIsDeleteModalOpen(false);
      setUpdateToDelete(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete weekly update', 'error');
    }
  });

  const seenMutation = useMutation({
    mutationFn: (id: string) => weeklyUpdateService.seenUpdate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-updates'] });
      showToast('Status updated!', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update status', 'error');
    }
  });

  const handleSeen = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    seenMutation.mutate(id);
  };

  const handleDelete = (update: WeeklyUpdateApi) => {
    setUpdateToDelete(update);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (updateToDelete) {
      deleteMutation.mutate(updateToDelete.id);
    }
  };

  const handleWeeklyExport = () => {
    setIsExportMenuOpen(false);
    const text = formatWeeklyUpdatesToText(updatesToDisplay);
    const weekLabel = getWeekLabel(filters.week);
    setExportPreviewData({
      title: 'Weekly Updates Export',
      subtitle: `Week ${filters.week} (${weekLabel})`,
      formattedText: text,
    });
    setIsExportModalOpen(true);
  };

  const handleBiweeklyExport = async () => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    try {
      const prevWeekStr = getPreviousWeekString(filters.week);
      const prevWeekFriday = getFridayFromWeek(prevWeekStr);
      const prevUpdates = await weeklyUpdateService.getUpdates({
        week_end_date: prevWeekFriday,
        name: selectedAssignee?.name || undefined
      });

      const currLabel = getWeekLabel(filters.week);
      const prevLabel = getWeekLabel(prevWeekStr);

      const text = formatBiweeklyUpdatesToText(
        updatesToDisplay,
        prevUpdates || [],
        currLabel,
        prevLabel
      );

      setExportPreviewData({
        title: 'Biweekly Updates Export',
        subtitle: `Weeks ${prevWeekStr} & ${filters.week} (${prevLabel} – ${currLabel})`,
        formattedText: text,
      });
      setIsExportModalOpen(true);
    } catch (err: any) {
      showToast('Failed to fetch previous week updates for biweekly export', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEdit = (update: WeeklyUpdateApi) => {
    setSelectedUpdate(update);
    setIsEditModalOpen(true);
  };

  const handleOpenDetail = (update: WeeklyUpdateApi) => {
    setSelectedUpdate(update);
    setIsDetailModalOpen(true);
  };

  const isWithin24Hours = (createdAt: string) => {
    if (!createdAt) return true;
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <section>
        <nav className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          <span>Projects</span>
          <ChevronRight size={12} className="opacity-40" />
          <span className="text-primary">Weekly Updates</span>
        </nav>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <h2 className="text-3xl font-bold tracking-tight text-on-surface">Weekly Updates</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <div className="relative group w-full sm:w-auto">
                <label className="relative block cursor-pointer">
                  <div className="bg-surface-container-low px-4 pl-9 py-2 rounded-xl text-xs font-bold border border-outline-variant/10 group-hover:bg-surface-container transition-all text-on-surface-variant w-full sm:w-auto flex items-center gap-2">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-hover:text-primary transition-colors pointer-events-none" size={14} />
                    <span>{getWeekLabel(filters.week)}</span>
                  </div>
                  <input 
                    type="week"
                    value={filters.week}
                    onChange={(e) => setFilters({ ...filters, week: e.target.value })}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker();
                      } catch (err) {
                        // Fallback for browsers that don't support showPicker
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 text-on-surface px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={18} className="animate-spin text-primary" /> : <Download size={18} className="text-primary" />}
                <span>Export</span>
              </button>

              <AnimatePresence>
                {isExportMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-outline-variant/10 py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-outline-variant/5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">
                      Export Format Options
                    </div>
                    <button
                      type="button"
                      onClick={handleWeeklyExport}
                      className="w-full px-4 py-3 text-left hover:bg-surface-container-low flex items-start gap-3 transition-colors group"
                    >
                      <FileText size={18} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                          Weekly Export
                        </span>
                        <span className="block text-[10px] text-on-surface-variant/70 mt-0.5">
                          Updates for selected week only
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleBiweeklyExport}
                      className="w-full px-4 py-3 text-left hover:bg-surface-container-low flex items-start gap-3 transition-colors group border-t border-outline-variant/5"
                    >
                      <FileText size={18} className="text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                          Biweekly Export
                        </span>
                        <span className="block text-[10px] text-on-surface-variant/70 mt-0.5">
                          Combines selected & previous week
                        </span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={onAddUpdate}
              className="primary-gradient text-on-primary px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex-1 sm:flex-none"
            >
              <Plus size={20} />
              <span>Add My Update</span>
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-error">
          <AlertCircle size={40} />
          <p className="font-medium">Failed to load updates. Please try again later.</p>
        </div>
      ) : updatesToDisplay.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant/20">
          <Calendar size={48} className="text-on-surface-variant/20" />
          <p className="text-on-surface-variant font-medium">No updates found for this week.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {updatesToDisplay.map((update, index) => (
            <motion.article
              key={`${update.id}-${update.username}-${update.week_end_date}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleOpenDetail(update)}
              className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/5 shadow-[0px_12px_32px_rgba(43,52,55,0.04)] flex flex-col h-full cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold text-base shadow-sm relative">
                    {update.username ? (
                      <img 
                        src={getProfileImage(update.username)} 
                        alt={update.name || update.username}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="absolute inset-0 flex items-center justify-center -z-10">
                      {(update.name || update.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface leading-tight text-sm">{update.name || update.username}</h4>
                    <p className="text-[10px] text-on-surface-variant font-medium opacity-60">{update.role}</p>
                  </div>
                </div>
                {update.occupancy !== undefined && (
                  <div className="bg-primary/5 text-primary px-3 py-1.5 rounded-xl border border-primary/10 flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-tight">{update.occupancy}% Occupancy</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 flex-1">
                {update.projects.slice(0, 1).map((project: any, pIndex: number) => (
                  <div key={pIndex} className="bg-surface-container-low/30 p-4 rounded-2xl border border-outline-variant/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Layout size={12} className="text-primary shrink-0" />
                        <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider truncate">{project.project_name}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-container-high text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                        <Briefcase size={10} />
                        <span>{project.client}</span>
                      </div>
                    </div>
                    <div 
                      className="text-xs text-on-surface-variant leading-relaxed font-medium line-clamp-4 prose prose-sm max-w-none prose-p:my-0 prose-headings:my-1"
                      dangerouslySetInnerHTML={{ __html: project.task_description }}
                    />
                  </div>
                ))}
                {update.projects.length > 1 && (
                  <div className="w-fit px-4 py-1.5 bg-surface-container-low/50 rounded-lg text-[10px] font-bold text-on-surface-variant/60 border border-outline-variant/10 flex items-center justify-center gap-2 self-start mt-2">
                    <span>+{update.projects.length - 1} more project{update.projects.length - 1 > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/5 mt-auto">
                <div 
                  title={update.seen_by_lead ? "Verified by Lead" : "Not yet verified"}
                  className={`flex items-center gap-2 text-[10px] font-bold transition-all ${
                    update.seen_by_lead ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {update.seen_by_lead ? (
                    <>
                      <CheckCheck size={14} className="text-primary" />
                      <span>Seen By Lead</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} className="text-primary" />
                      <span>Update Sent</span>
                    </>
                  )}
                </div>

                {((isWithin24Hours(update.created_at) && user?.username === update.username) || user?.admin) && (
                  <div className="flex items-center gap-5">
                    {((isWithin24Hours(update.created_at) && user?.username === update.username)) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(update); }}
                        className="text-[10px] font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 group"
                      >
                        <Edit size={14} className="opacity-40 group-hover:opacity-100" />
                        <span>Edit</span>
                      </button>
                    )}
                    {user?.admin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(update); }}
                        className="text-[10px] font-bold text-error hover:text-error/80 transition-colors flex items-center gap-2 group"
                      >
                        <Trash2 size={14} className="opacity-40 group-hover:opacity-100" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <WeeklyAchievementModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUpdate(null);
        }}
        initialData={selectedUpdate}
      />

      <WeeklyUpdateDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUpdate(null);
        }}
        update={selectedUpdate}
        onSeen={(id) => seenMutation.mutate(id)}
        isSeenPending={seenMutation.isPending}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUpdateToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Weekly Update"
        message="Are you sure you want to delete this weekly update? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={exportPreviewData.title}
        subtitle={exportPreviewData.subtitle}
        formattedText={exportPreviewData.formattedText}
      />
    </div>
  );
}

function ChevronDown({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
}
