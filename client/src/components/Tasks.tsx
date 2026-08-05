import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Plus, Loader2, AlertCircle, Calendar, ExternalLink, Tag, User, CheckCircle2, Clock, MoreHorizontal, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, FileText, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { useToast } from '../context/ToastContext';
import { Task, TaskStatus } from '../types';
import TaskModal from './Modals/TaskModal';
import TaskSubmissionModal from './Modals/TaskSubmissionModal';
import TaskReviewModal from './Modals/TaskReviewModal';
import TaskDetailModal from './Modals/TaskDetailModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import ReactMarkdown from 'react-markdown';
import { getProfileImage } from '../utils/userUtils';
import Pagination from './common/Pagination';

import { TasksSkeleton } from './ui/Skeleton';

export default function Tasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedAssignee, setSelectedAssignee } = useFilter();
  
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('status') || '';
  });

  const [page, setPage] = useState(1);
  const perPage = 12;

  // Sync username filter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const usernameParam = params.get('username');
    if (usernameParam && !selectedAssignee) {
      // We don't have the full member object here easily without re-querying or finding in members list
      // But we can just set the username part if that's all FilterContext needs
      // Actually TopBar handles the members list. 
      // For now let's just ensure TopBar filter syncs.
    }
  }, []);

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedAssignee?.username) {
      params.set('username', selectedAssignee.username);
    } else {
      params.delete('username');
    }
    
    if (statusFilter) {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }

    if (page > 1) {
      params.set('page', page.toString());
    } else {
      params.delete('page');
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [selectedAssignee, statusFilter, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedAssignee, statusFilter]);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [reviewAction, setReviewAction] = useState<{ id: string, status: 'Approved' | 'Rejected' } | null>(null);

  const { data: paginatedTasks, isLoading, isError } = useQuery({
    queryKey: ['tasks', selectedAssignee?.username, statusFilter, page],
    queryFn: () => taskService.getTasks({ 
      username: selectedAssignee?.username,
      status: statusFilter || undefined,
      page,
      per_page: perPage
    }),
  });

  const tasks = paginatedTasks?.data || [];
  const totalPages = (paginatedTasks && paginatedTasks.per_page > 0) ? Math.ceil(paginatedTasks.total / paginatedTasks.per_page) : 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast('Task deleted successfully', 'success');
      setIsDeleteModalOpen(false);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete task', 'error');
    }
  });

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Approved': return 'text-success bg-success/5 border-success/20';
      case 'Rejected': return 'text-error bg-error/5 border-error/20';
      case 'Submitted': return 'text-primary bg-primary/5 border-primary/20';
      default: return 'text-on-surface-variant bg-surface-container-low border-outline-variant/10/20';
    }
  };

  const getTagColor = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag.includes('python')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (normalizedTag.includes('sql')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (normalizedTag.includes('react')) return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    if (normalizedTag.includes('node')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (normalizedTag.includes('type')) return 'bg-blue-600/10 text-blue-600 border-blue-600/20';
    if (normalizedTag.includes('java')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (normalizedTag.includes('css')) return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    return 'bg-surface-container text-on-surface-variant border-outline-variant/10';
  };

  const handleEdit = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(false);
    setIsSubmissionModalOpen(true);
  };

  const handleReview = (id: string, status: 'Approved' | 'Rejected') => {
    setReviewAction({ id, status });
    setIsDetailModalOpen(false);
    setIsReviewModalOpen(true);
  };

  const openDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <section>
        <nav className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          <span>Platform</span>
          <ChevronRight size={12} className="opacity-40" />
          <span className="text-primary">Tasks</span>
        </nav>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface">Skill Assessment Tasks</h2>
              <p className="text-on-surface-variant font-medium mt-1">
                Log and track your tasks and achievements
              </p>
            </div>

            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/10 w-fit">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-primary focus:ring-0 cursor-pointer outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">New / Pending</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => { setSelectedTask(null); setIsTaskModalOpen(true); }}
            className="primary-gradient text-on-primary px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <Plus size={20} />
            <span>Create Task</span>
          </button>
        </div>
      </section>

      {isLoading ? (
        <TasksSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-error">
          <AlertCircle size={40} />
          <p className="font-medium">Failed to load tasks. Please try again later.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task, index) => {
              const status = task.status;
              const isOwner = user?.username === task.username;
              const canEdit = isOwner && (status === 'Pending' || status === 'Submitted');
              const canDelete = user?.admin || (isOwner && (status === 'Pending' || status === 'Submitted'));
              
              return (
                <motion.article
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openDetails(task)}
                  className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all flex flex-col h-full group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${
                      status === 'Approved' ? 'bg-green-100 text-green-600' : 
                      status === 'Rejected' ? 'bg-error/10 text-error' : 
                      status === 'Submitted' ? 'bg-blue-100 text-blue-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {status === 'Approved' ? <CheckCircle2 size={24} /> : 
                       status === 'Rejected' ? <XCircle size={24} /> :
                       status === 'Submitted' ? <Clock size={24} /> :
                       <Layout size={24} />}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {canEdit && <button 
                        onClick={(e) => handleEdit(e, task)}
                        className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant transition-colors"
                        title="Edit Task"
                      >
                        <Edit size={16} />
                      </button>}
                      {canDelete && <button 
                        onClick={(e) => handleDelete(e, task)}
                        className="p-2 hover:bg-error/10 rounded-xl text-error transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 size={16} />
                      </button>}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <h4 className="font-bold text-on-surface leading-tight line-clamp-2 text-lg group-hover:text-primary transition-colors">{task.title}</h4>
                    
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {task.tags.map(tag => (
                          <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded-md border border-primary/10">
                            <Tag size={10} />
                            <span className="uppercase tracking-tighter">{tag}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {task.description && (
                      <div className="text-sm text-on-surface-variant font-medium line-clamp-3 prose prose-sm max-w-none prose-primary pointer-events-none">
                        <ReactMarkdown>{task.description}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-outline-variant/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary relative">
                          {task.username ? (
                            <img 
                              src={getProfileImage(task.username)} 
                              alt={task.username}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span className="absolute inset-0 flex items-center justify-center -z-10">
                            {(task.created_by || task.username || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-on-surface-variant">{task.created_by}</span>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center border ${
                      status === 'Approved' ? 'bg-green-500/5 text-green-600 border-green-500/10' :
                      status === 'Rejected' ? 'bg-error/5 text-error/40 border-error/10' :
                      status === 'Submitted' ? 'bg-blue-500/5 text-blue-600 border-blue-500/10' :
                      'bg-amber-500/5 text-amber-600 border-amber-500/10'
                    }`}>
                      {status}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setSelectedTask(null); }}
        task={selectedTask}
      />

      <TaskSubmissionModal 
        isOpen={isSubmissionModalOpen}
        onClose={() => { setIsSubmissionModalOpen(false); setSelectedTask(null); }}
        task={selectedTask}
      />

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => taskToDelete && deleteMutation.mutate(taskToDelete.id)}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />

      {selectedTask && (
        <TaskDetailModal 
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          task={selectedTask}
          onReview={handleReview}
          onSubmitProof={handleSubmit}
          getStatusColor={getStatusColor}
          getTagColor={getTagColor}
        />
      )}

      {reviewAction && (
        <TaskReviewModal 
          isOpen={isReviewModalOpen}
          onClose={() => { setIsReviewModalOpen(false); setReviewAction(null); }}
          taskId={reviewAction.id}
          status={reviewAction.status}
        />
      )}
    </div>
  );
}
