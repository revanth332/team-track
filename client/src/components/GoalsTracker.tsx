import React, { useState, useMemo } from 'react';
import { Flag, CheckCircle2, Hourglass, Plus, ChevronRight, MoreVertical, Link as LinkIcon, ChevronLeft, Loader2, AlertCircle, BookOpen, Video, User, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilter } from '../context/FilterContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { goalService, teamService } from '../services/api';
import { QuarterlyGoal, TeamMember } from '../types';
import { getProfileImage } from '../utils/userUtils';
import GoalDetailModal from './Modals/GoalDetailModal';
import AddGoalModal from './Modals/AddGoalModal';
import { useAuth } from '../context/AuthContext';
import { TasksSkeleton } from './ui/Skeleton';

const BLOG_ONLY_STATUSES = ["Make Document", "Document Review", "Make Final Draft"];
const VIDEO_ONLY_STATUSES = ["Make PPT", "Format PPT(Sales)", "Record Video", "Format Video(Sales)", "PPT Review", "Video Review"];

const COLUMNS = [
  { id: 'Pending', title: 'Todo', statuses: ['Pending'] },
  { 
    id: 'In Progress', 
    title: 'In Progress', 
    subColumns: [
      // Blog Statuses
      { id: 'Make Document', title: 'Make Document', statuses: ['Make Document'], type: 'blog' },
      { id: 'Make Final Draft', title: 'Make Final Draft', statuses: ['Make Final Draft'], type: 'blog' },
      // Video Statuses
      { id: 'Make PPT', title: 'Make PPT', statuses: ['Make PPT', 'In Progress'], type: 'video' },
      { id: 'Format PPT(Sales)', title: 'Format PPT(Sales)', statuses: ['Format PPT(Sales)'], type: 'video' },
      { id: 'Record Video', title: 'Record Video', statuses: ['Record Video'], type: 'video' },
      { id: 'Format Video(Sales)', title: 'Format Video(Sales)', statuses: ['Format Video(Sales)'], type: 'video' }
    ]
  },
  { 
    id: 'In Review', 
    title: 'In Review', 
    subColumns: [
      { id: 'Document Review', title: 'Document Review', statuses: ['Document Review'], type: 'blog' },
      { id: 'PPT Review', title: 'PPT Review', statuses: ['PPT Review', 'In Review'], type: 'video' },
      { id: 'Video Review', title: 'Video Review', statuses: ['Video Review'], type: 'video' }
    ]
  },
  { 
    id: 'Done', 
    title: 'Done', 
    subColumns: [
      { id: 'Completed', title: 'Completed', statuses: ['Completed'] },
      { id: 'Canceled', title: 'Canceled', statuses: ['Canceled'] }
    ]
  },
];

export default function GoalsTracker() {
  const queryClient = useQueryClient();
  const [selectedGoal, setSelectedGoal] = useState<QuarterlyGoal | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { selectedAssignee } = useFilter();
  const { user } = useAuth();
  
  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  const [filters, setFilters] = useState({
    year: currentYear.toString(),
    quarter: currentQuarter,
    type: 'all' as 'all' | 'blog' | 'video'
  });

  const { data: goals, isLoading, isError } = useQuery({
    queryKey: ['goals', selectedAssignee?.username, filters.year, filters.quarter, filters.type],
    queryFn: () => goalService.getGoals({ 
      username: selectedAssignee?.username || undefined,
      year: filters.year,
      quarter: filters.quarter,
      type: filters.type === 'all' ? '' : filters.type
    }),
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => teamService.getMembers(),
  });

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => goalService.updateGoal(id, data),
    onMutate: async (newGoal) => {
      const queryKey = ['goals', selectedAssignee?.username, filters.year, filters.quarter, filters.type];
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousGoals = queryClient.getQueryData(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: QuarterlyGoal[] | undefined) => {
        if (!old) return [];
        return old.map(g => g.id === newGoal.id ? { ...g, ...newGoal.data } : g);
      });

      // Return a context object with the snapshotted value
      return { previousGoals, queryKey };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _newGoal, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousGoals);
      }
    },
    // Always refetch after error or success:
    onSettled: (_data, _error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });

  const stats = useMemo(() => {
    const backlogCount = goals?.filter(g => g.status === 'Pending').length || 0;
    const inReviewStatuses = ['Document Review', 'PPT Review', 'Video Review', 'In Review'];
    const inReviewCount = goals?.filter(g => inReviewStatuses.includes(g.status)).length || 0;
    const completedCount = goals?.filter(g => g.status === 'Completed').length || 0;
    const canceledCount = goals?.filter(g => g.status === 'Canceled').length || 0;
    const totalCount = goals?.length || 0;
    const inProgressCount = totalCount - backlogCount - inReviewCount - completedCount - canceledCount;

    return [
      { label: 'Total Goals', value: totalCount, icon: Flag, color: 'bg-primary-container text-primary' },
      { label: 'Backlog', value: backlogCount, icon: Hourglass, color: 'bg-amber-100 text-amber-700' },
      { label: 'In Progress', value: inProgressCount, icon: Hourglass, color: 'bg-secondary-container text-on-secondary-container' },
      { label: 'In Review', value: inReviewCount, icon: CheckCircle2, color: 'bg-blue-100 text-blue-700' },
      { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    ];
  }, [goals]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Extract original ID from composite draggableId (format: "id-index")
    const originalId = draggableId.split('-')[0];
    const goal = goals?.find(g => String(g.id) === originalId);
    if (!goal) return;

    let newStatus = destination.droppableId;
    
    // Type restriction: Blog goals can't go to video statuses and vice versa
    if (goal.type === 'blog' && VIDEO_ONLY_STATUSES.includes(newStatus)) return;
    if (goal.type === 'video' && BLOG_ONLY_STATUSES.includes(newStatus)) return;

    // If it's one of our status IDs, use it directly
    const validStatuses = [
      'Pending', 
      ...BLOG_ONLY_STATUSES,
      ...VIDEO_ONLY_STATUSES,
      'Completed', 'Canceled'
    ];
    if (!validStatuses.includes(newStatus)) return;

    // Use queryClient to optimistically update the UI
    const queryKey = ['goals', selectedAssignee?.username, filters.year, filters.quarter, filters.type];
    const previousGoals = queryClient.getQueryData<QuarterlyGoal[]>(queryKey);

    queryClient.setQueryData(queryKey, (old: QuarterlyGoal[] | undefined) => {
      if (!old) return [];
      return old.map(g => g.id === goal.id ? { ...g, status: newStatus } : g);
    });

    updateGoalMutation.mutate({
      id: goal.id,
      data: {
        ...goal,
        status: newStatus,
        type: goal.type, // Explicitly send type as requested
      }
    }, {
      onError: () => {
        // Rollback on failure
        queryClient.setQueryData(queryKey, previousGoals);
      },
      onSettled: () => {
        // Refetch to ensure sync
        queryClient.invalidateQueries({ queryKey });
      }
    });
  };

  const handleCardClick = (goal: QuarterlyGoal) => {
    setSelectedGoal(goal);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <section className="flex items-center justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 mb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            <span>Performance</span>
            <ChevronRight size={12} className="opacity-40" />
            <span className="text-primary">Goals Tracker</span>
          </nav>
          <h2 className="text-3xl font-bold tracking-tight text-on-surface">Quarterly Goals</h2>
          <p className="text-on-surface-variant mt-1 font-medium max-w-lg hidden sm:block">Strategic objectives and content production targets for the current quarter.</p>
        </div>
        {user.admin && <button 
          onClick={() => {
            setSelectedGoal(null);
            setIsAddModalOpen(true);
          }}
          className="primary-gradient text-on-primary px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform shrink-0"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">New Goal</span>
        </button>}
      </section>

      <section className="bg-surface-container-low/50 p-4 rounded-3xl border border-outline-variant/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/5">
              {(['all', 'blog', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilters({ ...filters, type })}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    filters.type === type 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'blog' ? 'Blogs' : 'Videos'}
                </button>
              ))}
            </div>
            
            <div className="h-6 w-[1px] bg-outline-variant/20 hidden md:block" />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                className="flex-1 sm:flex-none bg-surface-container-low px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/10 outline-none transition-all text-on-surface-variant focus:ring-2 focus:ring-primary/10"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select 
                value={filters.quarter}
                onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}
                className="flex-1 sm:flex-none bg-surface-container-low px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/10 outline-none transition-all text-on-surface-variant focus:ring-2 focus:ring-primary/10"
              >
                {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-1">
             <div className="flex items-center gap-2 text-on-surface-variant/40 text-[10px] font-bold uppercase tracking-widest">
                <Search size={14} />
                <span>Quick Search</span>
             </div>
          </div>
        </div>
      </section>

      {/* Stats Bento */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/5 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-on-surface">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Kanban Board Section */}
      <section className="flex-1 min-h-0">
        {isLoading ? (
          <TasksSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-error">
            <AlertCircle size={40} />
            <p className="font-medium">Failed to load goals. Please try again later.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full space-y-6">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 h-full items-start">
                {COLUMNS.map((column) => (
                  <div key={column.id} className="flex flex-col h-full w-full bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{column.title}</h3>
                        <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {(() => {
                            if (!column.subColumns) return (goals || []).filter(g => column.statuses?.includes(g.status)).length;
                            let count = 0;
                            column.subColumns.forEach(sub => {
                              count += (goals || []).filter(g => sub.statuses.includes(g.status)).length;
                            });
                            return count;
                          })()}
                        </span>
                      </div>
                    </div>

                    {column.subColumns ? (
                      <div className="flex flex-col gap-4 flex-1">
                        {column.subColumns.map((sub) => (
                          <div key={sub.id} className="flex flex-col flex-1">
                            <div className="flex items-center gap-2 mb-2 px-2">
                              <span className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant/80">{sub.title}</span>
                            </div>
                            <Droppable droppableId={sub.id}>
                              {(provided: any, snapshot: any) => {
                                // Check if this sub-column is compatible with the item being dragged
                                const isCompatible = !snapshot.draggingOverWith || (() => {
                                  const originalId = snapshot.draggingOverWith.split('-')[0];
                                  const draggedGoal = goals?.find(g => String(g.id) === originalId);
                                  if (!draggedGoal) return true;
                                  if (draggedGoal.type === 'blog' && VIDEO_ONLY_STATUSES.includes(sub.id)) return false;
                                  if (draggedGoal.type === 'video' && BLOG_ONLY_STATUSES.includes(sub.id)) return false;
                                  return true;
                                })();

                                return (
                                  <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 space-y-3 min-h-[100px] transition-colors rounded-2xl p-1 border-2 border-dashed ${
                                      snapshot.isDraggingOver 
                                        ? (isCompatible ? 'bg-green-500/5 border-green-500/20' : 'bg-error/5 border-error/20') 
                                        : 'border-transparent'
                                    }`}
                                  >
                                    {(goals || [])
                                      .filter(goal => sub.statuses.includes(goal.status))
                                      .map((goal, index) => (
                                      <Draggable key={`${goal.id}-${index}`} {...({ draggableId: `${goal.id}-${index}`, index } as any)}>
                                        {(provided: any, snapshot: any) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            onClick={() => handleCardClick(goal)}
                                            className={`${goal.status === 'Completed' ? 'bg-green-50' : goal.status === 'Canceled' ? 'bg-red-50' : 'bg-white'} p-4 rounded-2xl border ${goal.status === 'Completed' ? 'border-green-100' : goal.status === 'Canceled' ? 'border-red-100' : 'border-outline-variant/10'} shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                                              snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 rotate-2' : ''
                                            }`}
                                          >
                                            <div className="flex items-start justify-between mb-3">
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                goal.type === 'blog' ? 'bg-green-500/10 text-green-600' : 'bg-green-500/10 text-green-600'
                                              }`}>
                                                {goal.type === 'blog' ? <BookOpen size={14} /> : <Video size={14} />}
                                              </div>
                                              <div className="flex flex-col items-end gap-1">
                                                <div className="w-16 h-1 bg-surface-container rounded-full overflow-hidden shadow-inner">
                                                  <div 
                                                    className="bg-linear-to-r from-green-400 to-green-600 h-full transition-all duration-700 ease-out" 
                                                    style={{ width: `${goal.progress}%` }}
                                                  />
                                                </div>
                                                <span className="text-[9px] font-bold text-on-surface-variant/60">{goal.progress}%</span>
                                              </div>
                                            </div>

                                            <h4 className="text-sm font-bold text-on-surface mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                              {goal.title}
                                            </h4>

                                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/5">
                                              <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary relative">
                                                  {(() => {
                                                    const username = goal.assignee_username;
                                                    if (username) {
                                                      return (
                                                        <img 
                                                          src={getProfileImage(username)} 
                                                          alt={goal.assignee}
                                                          className="w-full h-full object-cover"
                                                          referrerPolicy="no-referrer"
                                                          onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                          }}
                                                        />
                                                      );
                                                    }
                                                    return null;
                                                  })()}
                                                  <span className="absolute inset-0 flex items-center justify-center -z-10">
                                                    {(goal.assignee || '?').charAt(0).toUpperCase()}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] font-bold text-on-surface-variant truncate max-w-[80px]">
                                                  {goal.assignee || 'Unassigned'}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1 text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                                                {goal.quarter} {goal.year}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                  {provided.placeholder}
                                </div>
                              );
                            }}
                          </Droppable>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Droppable droppableId={column.id}>
                        {(provided: any, snapshot: any) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={`flex-1 space-y-3 min-h-[500px] transition-colors rounded-2xl p-1 ${
                              snapshot.isDraggingOver ? 'bg-primary/5' : ''
                            }`}
                          >
                            {(goals || [])
                              .filter(goal => column.statuses?.includes(goal.status))
                              .map((goal, index) => (
                                <Draggable key={`${goal.id}-${index}`} {...({ draggableId: `${goal.id}-${index}`, index } as any)}>
                                  {(provided: any, snapshot: any) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => handleCardClick(goal)}
                                      className={`${goal.status === 'Completed' ? 'bg-green-50' : goal.status === 'Canceled' ? 'bg-red-50' : 'bg-white'} p-4 rounded-2xl border ${goal.status === 'Completed' ? 'border-green-100' : goal.status === 'Canceled' ? 'border-red-100' : 'border-outline-variant/10'} shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                                        snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 rotate-2' : ''
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                          goal.type === 'blog' ? 'bg-green-500/10 text-green-600' : 'bg-green-500/10 text-green-600'
                                        }`}>
                                          {goal.type === 'blog' ? <BookOpen size={14} /> : <Video size={14} />}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <div className="w-16 h-1 bg-surface-container rounded-full overflow-hidden shadow-inner">
                                            <div 
                                              className="bg-linear-to-r from-green-400 to-green-600 h-full transition-all duration-700 ease-out" 
                                              style={{ width: `${goal.progress}%` }}
                                            />
                                          </div>
                                          <span className="text-[9px] font-bold text-on-surface-variant/60">{goal.progress}%</span>
                                        </div>
                                      </div>

                                      <h4 className="text-sm font-bold text-on-surface mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                        {goal.title}
                                      </h4>

                                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary relative">
                                            {(() => {
                                              const username = goal.assignee_username;
                                              if (username) {
                                                return (
                                                  <img 
                                                    src={getProfileImage(username)} 
                                                    alt={goal.assignee}
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                      (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                  />
                                                );
                                              }
                                              return null;
                                            })()}
                                            <span className="absolute inset-0 flex items-center justify-center -z-10">
                                              {(goal.assignee || '?').charAt(0).toUpperCase()}
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-bold text-on-surface-variant truncate max-w-[80px]">
                                            {goal.assignee || 'Unassigned'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                                          {goal.quarter} {goal.year}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </div>
                ))}
              </div>
            </DragDropContext>
          </div>
        )}
      </section>

      <GoalDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        goal={goals?.find(g => g.id === selectedGoal?.id) || null}
        onEdit={(goal) => {
          setSelectedGoal(goal);
          setIsDetailModalOpen(false);
          setIsAddModalOpen(true);
        }}
      />

      <AddGoalModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        goalToEdit={selectedGoal}
      />
    </div>
  );
}
