import React, { useState } from 'react';
import { ChevronRight, Plus, Lightbulb, Loader2, AlertCircle, Search, Edit2, Trash2, CheckCircle2, User, Link as LinkIcon, AlertTriangle, BookOpen, Eye, Tag, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFilter } from '../context/FilterContext';
import { ideaService } from '../services/api';
import { Idea } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { getProfileImage } from '../utils/userUtils';
import { TasksSkeleton } from './ui/Skeleton';
import IdeaModal from './Modals/IdeaModal';
import IdeaDetailModal from './Modals/IdeaDetailModal';
import AssignContentModal from './Modals/AssignContentModal';
import ConfirmationModal from './Modals/ConfirmationModal';
import ReactMarkdown from 'react-markdown';
import Pagination from './common/Pagination';

export default function Ideas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedAssignee } = useFilter();
  const canApprove = user?.position === 'lead' || user?.position === 'manager';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignContentModalOpen, setIsAssignContentModalOpen] = useState(false);
  const [assignContentType, setAssignContentType] = useState<'blog' | 'video'>('blog');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
  const [ideaToAssign, setIdeaToAssign] = useState<Idea | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'blog' | 'video'>('all');
  const [page, setPage] = useState(1);
  const perPage = 12;
  const debouncedSearch = useDebounce(searchTerm, 500);

  const { data: paginatedIdeas, isLoading, isError } = useQuery({
    queryKey: ['ideas', selectedAssignee?.username, debouncedSearch, statusFilter, typeFilter, page],
    queryFn: () => ideaService.getIdeas({ 
      username: selectedAssignee?.username || undefined,
      title: debouncedSearch || undefined,
      status: statusFilter || undefined,
      tag: typeFilter === 'all' ? '' : typeFilter,
      page,
      per_page: perPage
    }),
  });

  const ideas = paginatedIdeas?.data || [];
  const totalPages = (paginatedIdeas && paginatedIdeas.per_page > 0) ? Math.ceil(paginatedIdeas.total / paginatedIdeas.per_page) : 0;

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [selectedAssignee, debouncedSearch, statusFilter, typeFilter]);

  const deleteMutation = useMutation({
    mutationFn: ideaService.deleteIdea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      showToast('Idea deleted successfully!', 'success');
      setIdeaToDelete(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete idea', 'error');
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ idea, status }: { idea: Idea, status: 'Approved' | 'Rejected' }) => ideaService.updateIdea(idea.id, {
      ...idea,
      status: status,
    } as any),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      showToast(`Idea ${variables.status.toLowerCase()}ed successfully!`, 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update idea status', 'error');
    }
  });

  const updateIdeaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Idea> }) => {
      const idea = ideas?.find(i => i.id === id);
      if (!idea) throw new Error('Idea not found');
      return ideaService.updateIdea(id, {
        added_by: user?.username || idea.username,
        title: idea.title,
        description: idea.description,
        links: idea.links,
        status: idea.status,
        blog_assignee: idea.blog_assignee,
        video_assignee: idea.video_assignee,
        tags: idea.tags,
        ...data
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      showToast('Idea updated successfully!', 'success');
      setIsModalOpen(false);
      setIsAssignContentModalOpen(false);
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to update idea', 'error');
    }
  });

  const handleEdit = (idea: Idea) => {
    setSelectedIdea(idea);
    setIsModalOpen(true);
  };

  const handleViewDetails = (idea: Idea) => {
    setSelectedIdea(idea);
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (idea: Idea) => {
    setIdeaToDelete(idea);
  };

  const confirmDelete = () => {
    if (ideaToDelete) {
      deleteMutation.mutate(ideaToDelete.id);
    }
  };

  const handleAdd = () => {
    setSelectedIdea(null);
    setIsModalOpen(true);
  };

  const handleStatusUpdate = (idea: Idea, status: 'Approved' | 'Rejected') => {
    statusMutation.mutate({ idea, status });
  };

  const handleMakeBlogClick = (idea: Idea) => {
    setIdeaToAssign(idea);
    setAssignContentType('blog');
    setIsAssignContentModalOpen(true);
  };

  const handleMakeVideoClick = (idea: Idea) => {
    setIdeaToAssign(idea);
    setAssignContentType('video');
    setIsAssignContentModalOpen(true);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <section>
        <nav className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
          <span>Goals</span>
          <ChevronRight size={12} className="opacity-40" />
          <span className="text-primary">Ideas Pipeline</span>
        </nav>
        
        <div className="space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Ideas Pipeline</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <div className="relative group w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={14} />
                <input 
                  type="text"
                  placeholder="Search ideas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-surface-container-low px-4 pl-9 py-2 rounded-xl text-xs font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant w-full"
                />
              </div>
              <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    typeFilter === 'all' 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter('blog')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    typeFilter === 'blog' 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Blogs
                </button>
                <button
                  onClick={() => setTypeFilter('video')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    typeFilter === 'video' 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Videos
                </button>
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-low px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/10 focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface-variant w-full sm:w-auto appearance-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <button 
              onClick={handleAdd}
              className="primary-gradient text-on-primary px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform w-full sm:w-auto"
            >
              <Plus size={20} />
              <span>Submit Idea</span>
            </button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <TasksSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-error">
          <AlertCircle size={40} />
          <p className="font-medium">Failed to load ideas. Please try again later.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {ideas.map((idea, index) => (
                <motion.article
                  key={`${idea.id}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleViewDetails(idea)}
                  className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/5 shadow-sm hover:shadow-md transition-all flex flex-col h-full group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${
                      idea.status === 'Approved' ? 'bg-green-100 text-green-600' : 
                      idea.status === 'Rejected' ? 'bg-error/10 text-error' : 
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {idea.status === 'Approved' ? <CheckCircle2 size={24} /> : <Lightbulb size={24} />}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      {user?.username === idea.username && <button 
                        onClick={() => handleEdit(idea)}
                        className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant transition-colors"
                        title="Edit Idea"
                      >
                        <Edit2 size={16} />
                      </button>}
                      {user?.admin && <button 
                        onClick={() => handleDeleteClick(idea)}
                        className="p-2 hover:bg-error/10 rounded-xl text-error transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>}
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      {idea.is_blog && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 text-[9px] font-bold rounded-md border border-green-500/10">
                          <BookOpen size={10} />
                          <span className="uppercase tracking-tighter">Blog</span>
                        </div>
                      )}
                      {idea.is_video && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-[9px] font-bold rounded-md border border-blue-500/10">
                          <Video size={10} />
                          <span className="uppercase tracking-tighter">Video</span>
                        </div>
                      )}
                    </div>
                    <h4 className="font-bold text-on-surface leading-tight line-clamp-2">{idea.title}</h4>
                    
                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {idea.tags.map(tag => (
                          <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded-md border border-primary/10">
                            <Tag size={10} />
                            <span className="uppercase tracking-tighter">{tag}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-sm text-on-surface-variant font-medium line-clamp-3 prose prose-sm max-w-none prose-primary">
                      <ReactMarkdown>{idea.description}</ReactMarkdown>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-outline-variant/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary relative">
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
                      <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                        {new Date(idea.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {idea.status === 'Pending' ? (
                        canApprove ? (
                          <div className="flex items-center gap-2 w-full">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(idea, 'Approved'); }}
                              disabled={statusMutation.isPending}
                              className="flex-1 bg-green-500/10 text-green-600 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(idea, 'Rejected'); }}
                              disabled={statusMutation.isPending}
                              className="flex-1 bg-error/10 text-error py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-error/20 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 bg-amber-500/5 text-amber-600/60 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center border border-amber-500/10">
                            Pending Approval
                          </div>
                        )
                      ) : idea.status === 'Approved' ? (
                        canApprove ? (
                          <div className="flex items-center gap-2 w-full">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMakeBlogClick(idea); }}
                              disabled={updateIdeaMutation.isPending || !!idea.blog_assignee}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                idea.blog_assignee 
                                  ? 'bg-green-500/10 text-green-600' 
                                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                              }`}
                            >
                              {idea.blog_assignee ? 'Blog Assigned' : 'Assign Blog'}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleMakeVideoClick(idea); }}
                              disabled={updateIdeaMutation.isPending || !!idea.video_assignee}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                idea.video_assignee 
                                  ? 'bg-green-500/10 text-green-600' 
                                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                              }`}
                            >
                              {idea.video_assignee ? 'Video Assigned' : 'Assign Video'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 bg-green-500/5 text-green-600 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center border border-green-500/10">
                            Approved
                          </div>
                        )
                      ) : (
                        <div className="flex-1 bg-error/5 text-error/40 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center border border-error/10">
                          Rejected
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <IdeaModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ideaToEdit={selectedIdea}
      />

      <IdeaDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        idea={selectedIdea}
        onEdit={(idea) => {
          setIsDetailModalOpen(false);
          handleEdit(idea);
        }}
        onDelete={handleDeleteClick}
        isAdmin={canApprove}
        allowEdit={user?.username === selectedIdea?.username}
      />

      <AssignContentModal 
        isOpen={isAssignContentModalOpen}
        onClose={() => {
          setIsAssignContentModalOpen(false);
          setIdeaToAssign(null);
        }}
        idea={ideaToAssign}
        type={assignContentType}
      />

      <ConfirmationModal
        isOpen={!!ideaToDelete}
        onClose={() => setIdeaToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Idea"
        message={`Are you sure you want to delete "${ideaToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Idea"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
