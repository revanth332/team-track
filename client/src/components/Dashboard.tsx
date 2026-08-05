import { useState, useEffect } from 'react';
import { Rocket, Video, RefreshCw, TrendingUp, Clock, Info, Flag, CalendarOff, AlertCircle, FileText, Clapperboard, CalendarClock, Lightbulb, FileVideo, ArrowRightLeft, Users, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { goalService, shiftService, teamService, weeklyUpdateService, ideaService, setGlobalLeadId } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { motion } from 'motion/react';
import { getProfileImage } from '../utils/userUtils';
import { getFridayFromWeek, getDefaultWeek } from '../utils/dateUtils';
import { Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { DashboardSkeleton } from './ui/Skeleton';

export default function Dashboard() {
  const { user } = useAuth();
  const { selectedAssignee, selectedLeadId } = useFilter();
  const [dashboardLeadId, setDashboardLeadId] = useState<string | null>(null);
  const isManager = user?.position === 'manager';
  const effectiveLeadId = dashboardLeadId || selectedLeadId || undefined;
  const now = new Date();
  const today = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => teamService.getLeads(),
    enabled: isManager && !selectedLeadId
  });

  const { data: goals, isLoading: goalsLoading, isError: goalsError } = useQuery({
    queryKey: ['goals', selectedAssignee?.username, effectiveLeadId],
    queryFn: () => goalService.getGoals({ 
      username: selectedAssignee?.username || undefined,
      lead_id: effectiveLeadId
    }),
  });

  const { data: shifts, isLoading: shiftsLoading, isError: shiftsError } = useQuery({
    queryKey: ['shifts', selectedAssignee?.name, now.getFullYear(), now.getMonth() + 1, effectiveLeadId],
    queryFn: () => shiftService.getShifts({ 
      name: selectedAssignee?.name || undefined,
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString()
    }),
    enabled: !isManager,
    retry: false
  });

  const { data: bandwidthData, isLoading: bandwidthLoading, isError: bandwidthError } = useQuery({
    queryKey: ['bandwidth', effectiveLeadId],
    queryFn: () => teamService.getMemberBandwidth(effectiveLeadId),
  });

  const currentWeekEnd = getFridayFromWeek(getDefaultWeek());
  const { data: weeklyUpdates, isLoading: weeklyUpdatesLoading, isError: weeklyUpdatesError } = useQuery({
    queryKey: ['weekly-updates', currentWeekEnd, effectiveLeadId],
    queryFn: () => weeklyUpdateService.getUpdates({ week_end_date: currentWeekEnd }),
  });

  const { data: ideas, isLoading: ideasLoading, isError: ideasError } = useQuery({
    queryKey: ['ideas', selectedAssignee?.username, effectiveLeadId],
    queryFn: () => ideaService.getIdeas({ 
      username: selectedAssignee?.username || undefined,
      lead_id: effectiveLeadId
    })
  });

  const isLoading = bandwidthLoading || goalsLoading || shiftsLoading || weeklyUpdatesLoading || ideasLoading;
  const membersError = bandwidthError; // Map to keep backward compatibility with error layout if any

  const [activeGoalTab, setActiveGoalTab] = useState<'year' | 'quarter'>('quarter');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>(`Q${Math.floor(new Date().getMonth() / 3) + 1}`);

  const yearsList = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  const filteredGoals = goals || [];
  
  const [tableYear, setTableYear] = useState<string>(new Date().getFullYear().toString());
  const [tableQuarter, setTableQuarter] = useState<string>(`Q${Math.floor(new Date().getMonth() / 3) + 1}`);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tablePage, setTablePage] = useState(1);
  const itemsPerPage = 15;

  const tableFilteredGoals = filteredGoals.filter(goal => {
    const matchesYear = goal.year.toString() === tableYear;
    const matchesQuarter = goal.quarter === tableQuarter;
    const matchesSearch = tableSearch === '' || 
      goal.assignee?.toLowerCase().includes(tableSearch.toLowerCase()) ||
      goal.title?.toLowerCase().includes(tableSearch.toLowerCase()) ||
      goal.assignee_username?.toLowerCase().includes(tableSearch.toLowerCase());
    
    return matchesYear && matchesQuarter && matchesSearch;
  });

  const totalTablePages = Math.ceil(tableFilteredGoals.length / itemsPerPage);
  const paginatedGoals = tableFilteredGoals.slice((tablePage - 1) * itemsPerPage, tablePage * itemsPerPage);

  const currentYearStr = new Date().getFullYear().toString();
  const currentMonth = new Date().getMonth();
  const currentQuarterNum = Math.floor(currentMonth / 3) + 1;
  const currentQuarterStr = `Q${currentQuarterNum}`;

  const goalsForTab = activeGoalTab === 'year' 
    ? filteredGoals.filter(g => String(g.year) === selectedYear)
    : filteredGoals.filter(g => String(g.year) === selectedYear && String(g.quarter) === selectedQuarter);

  const completedGoals = goalsForTab.filter(g => g.status === 'Completed');
  const totalGoalsCount = goalsForTab.length;
  
  const blogCompletedCount = completedGoals.filter(g => g.type === 'blog').length;
  const videoCompletedCount = completedGoals.filter(g => g.type === 'video').length;

  const pendingGoalsAcrossTime = filteredGoals.filter(g => !['Completed', 'Canceled'].includes(g.status));
  const blogPendingCount = pendingGoalsAcrossTime.filter(g => g.type === 'blog').length;
  const videoPendingCount = pendingGoalsAcrossTime.filter(g => g.type === 'video').length;
  
  const completionRate = totalGoalsCount > 0 ? Math.round((completedGoals.length / totalGoalsCount) * 100) : 0;

  // Analytics Calculations
  const totalMembers = bandwidthData?.length || 0;
  const submittedMembers = new Set((weeklyUpdates || []).map(u => u.username)).size;
  const pendingMembers = Math.max(0, totalMembers - submittedMembers);

  const updatesChartData = [
    { name: 'Submitted', value: submittedMembers, color: '#4d44e3' },
    { name: 'Pending', value: pendingMembers, color: '#ff8b9a' }
  ];

  const filteredIdeas = ideas?.data || [];
  const totalIdeasCount = ideas?.total || 0;
  
  // Implemented = has assigned blog or video. 
  // Approved = approved status, but not yet implemented.
  const approvedIdeas = filteredIdeas.filter(i => i.status === 'Approved').length;
  const pendingIdeas = filteredIdeas.filter(i => i.status === 'Pending').length;
  const rejectedIdeas = filteredIdeas.filter(i => i.status === 'Rejected').length;
  
  const ideasChartData = [
    { name: 'Pending', value: pendingIdeas, color: '#f59e0b' },
    { name: 'Approved', value: approvedIdeas, color: '#3b82f6' },
    { name: 'Rejected', value: rejectedIdeas, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const currentYear = new Date().getFullYear();
  const activeShiftChanges = (shifts || []).filter(s => !s.lead_approval || s.lead_approval === 'Pending') || [];

  const getUsernameByEmpname = (name: string) => {
    const member = bandwidthData?.find(m => String(m.name) === String(name));
    return member?.username;
  };

  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay(); // 0 (Sun) to 6 (Sat)
  const isSubmissionDays = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  const weekLabel = isSubmissionDays ? "This week" : "Last week";

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          {isManager && selectedLeadId ? (
            <>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface">
                Performance Dashboard for {leads?.find(l => l.username === selectedLeadId)?.name || 'Lead'}
              </h2>
              <p className="text-on-surface-variant mt-1 font-medium italic">
                Manager Console — displaying real-time goals, utilization bandwidth, metrics, and weekly achievements for the team led by {leads?.find(l => l.username === selectedLeadId)?.name || 'the team lead'}.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold tracking-tight text-on-surface">Welcome back, {user?.name?.split(' ')[0] || 'User'}</h2>
              <p className="text-on-surface-variant mt-1 font-medium italic">Here is what's happening with Team today.</p>
            </>
          )}
        </div>

        {isManager && !selectedLeadId && (
          <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/10 min-w-[240px]">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-0.5">Filter by Lead</p>
              <select 
                value={dashboardLeadId || ''} 
                onChange={(e) => setDashboardLeadId(e.target.value || null)}
                className="w-full bg-transparent border-none p-0 text-sm font-bold text-on-surface focus:ring-0 outline-none cursor-pointer"
              >
                <option value="">All Leads</option>
                {leads?.map(lead => (
                  <option key={lead.username} value={lead.username}>{lead.name}</option>
                ))}
              </select>
            </div>
            <ChevronDown size={16} className="text-on-surface-variant/40 mr-2" />
          </div>
        )}

      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/5 group"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-1 mb-2 bg-gray-200 rounded-lg p-1 relative w-fit">
                <button 
                  onClick={() => setActiveGoalTab('quarter')}
                  className={`relative px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md z-10 transition-colors ${
                    activeGoalTab === 'quarter' ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Quarter ({currentQuarterStr})
                  {activeGoalTab === 'quarter' && (
                    <motion.div layoutId="dashboardGoalTab" className="absolute inset-0 bg-white shadow-sm rounded-md -z-10" />
                  )}
                </button>
                <button 
                  onClick={() => setActiveGoalTab('year')}
                  className={`relative px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-md z-10 transition-colors ${
                    activeGoalTab === 'year' ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Year {currentYear}
                  {activeGoalTab === 'year' && (
                    <motion.div layoutId="dashboardGoalTab" className="absolute inset-0 bg-white shadow-sm rounded-md -z-10" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Goals Completed</p>
                {activeGoalTab === 'quarter' ? (
                  <select 
                    value={selectedQuarter} 
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="bg-surface-container-low border-none rounded-lg px-2 py-1 text-[10px] font-bold text-on-surface focus:ring-1 focus:ring-primary/10 outline-none w-16"
                  >
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                ) : (
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-surface-container-low border-none rounded-lg px-2 py-1 text-[10px] font-bold text-on-surface focus:ring-1 focus:ring-primary/10 outline-none w-16"
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}
              </div>
              <h3 className="text-4xl font-bold text-on-surface">
                {goalsError ? (
                  <span className="text-error text-xl flex items-center gap-1"><AlertCircle size={18} /> Error</span>
                ) : (
                  <>{completedGoals.length}<span className="text-on-surface-variant/30">/{totalGoalsCount}</span></>
                )}
              </h3>
            </div>
            <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Rocket size={24} />
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">{blogCompletedCount} Blogs</span>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">{videoCompletedCount} Videos</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <TrendingUp size={14} className="text-green-500" />
            <span>{completionRate}% of target achieved</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/5 group flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">Pending Blogs/Videos</p>
                <h3 className="text-5xl font-bold text-on-surface">
                  {goalsError ? (
                    <span className="text-error text-xl flex items-center gap-1"><AlertCircle size={18} /> Error</span>
                  ) : (
                    pendingGoalsAcrossTime.length
                  )}
                </h3>
              </div>
              <div className="w-12 h-12 bg-tertiary-container/20 rounded-xl flex items-center justify-center text-tertiary group-hover:scale-110 transition-transform">
                <FileVideo size={24} />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <span className="px-2.5 py-1 bg-surface-container-high rounded-lg text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{blogPendingCount} Blogs</span>
              <span className="px-2.5 py-1 bg-surface-container-high rounded-lg text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{videoPendingCount} Videos</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mt-4">
            <Clock size={14} className="text-amber-500" />
            <span>Active production pipeline</span>
          </div>
        </motion.div>

        {!isManager && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/5 group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">Pending Shift Changes</p>
                  <h3 className="text-5xl font-bold text-on-surface">
                    {shiftsError ? (
                      <span className="text-error text-xl flex items-center gap-1"><AlertCircle size={18} /> Error</span>
                    ) : (
                      <>{activeShiftChanges.length} <span className="text-lg font-medium text-on-surface-variant/40">pending</span></>
                    )}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center text-on-secondary-container group-hover:scale-110 transition-transform">
                  <ArrowRightLeft size={24} />
                </div>
              </div>
              <div className="flex -space-x-2 mb-4 overflow-hidden">
                {activeShiftChanges.slice(0, 5).map((shift, index) => {
                  const username = getUsernameByEmpname(shift.name);
                  return (
                    <div 
                      key={`${shift.id}-${index}`}
                      className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary shadow-sm overflow-hidden relative"
                    >
                      {username ? (
                        <img 
                          src={getProfileImage(username)} 
                          alt={shift.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center -z-10">
                        {shift.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  );
                })}
                {activeShiftChanges.length > 5 && (
                  <div key="more-shifts-indicator" className="w-8 h-8 rounded-full border-2 border-white bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                    +{(activeShiftChanges.length) - 5}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mt-4">
              <Info size={14} className="text-indigo-500" />
              <span>Pending lead approvals</span>
            </div>
          </motion.div>
        )}
      </section>

      {/* Analytics Charts & Utilization Section */}
      <section className={`grid grid-cols-1 ${!isManager ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8`}>
        {!isManager && (
          <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 flex flex-col">
            <div className="px-6 py-4 bg-white flex justify-between items-center border-b border-outline-variant/5">
              <h4 className="font-bold text-on-surface flex items-center gap-3">
                <FileText size={20} className="text-secondary" />
                <span>Weekly Updates</span>
              </h4>
              <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-4">
                {weekLabel}
              </span>
            </div>
            <div className="pb-4 bg-white flex-1 min-h-[200px] flex items-center justify-center relative">
              {weeklyUpdatesError ? (
                <div className="flex flex-col items-center gap-1 text-on-surface-variant font-medium text-xs opacity-60">
                  <AlertCircle size={20} className="text-error" />
                  <span>Failed to load updates</span>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={updatesChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {updatesChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          padding: '4px 8px',
                          fontSize: '10px',
                          zIndex: 100
                        }}
                        itemStyle={{ fontWeight: 'bold', padding: '0' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-on-surface leading-none">{totalMembers}</span>
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Members</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ideas Pipeline Widget */}
        <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 flex flex-col">
          <div className="px-6 py-4 bg-white flex justify-between items-center border-b border-outline-variant/5">
            <h4 className="font-bold text-on-surface flex items-center gap-3">
              <Lightbulb size={20} className="text-amber-500" />
              <span>Ideas Pipeline</span>
            </h4>
          </div>
          <div className="pb-4 bg-white flex-1 min-h-[200px] flex items-center justify-center relative">
            {ideasError ? (
              <div className="flex flex-col items-center gap-1 text-on-surface-variant font-medium text-xs opacity-60">
                <AlertCircle size={20} className="text-error" />
                <span>Failed to load ideas</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={ideasChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {ideasChartData.map((entry, index) => (
                        <Cell key={`idea-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '4px 8px',
                        fontSize: '10px',
                        zIndex: 100
                      }}
                      itemStyle={{ fontWeight: 'bold', padding: '0' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-on-surface leading-none">{totalIdeasCount}</span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Ideas</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Team Utilization Widget */}
        <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10">
          <div className="px-8 py-6 bg-white flex justify-between items-center border-b border-outline-variant/5">
            <h4 className="font-bold text-on-surface flex items-center gap-3">
              <Users size={20} className="text-primary" />
              <span>Team Utilization</span>
            </h4>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest pl-4">
              Sorted by Bandwidth
            </span>
          </div>
          <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
            {bandwidthError ? (
              <div className="p-12 flex flex-col items-center gap-1 text-on-surface-variant font-medium text-xs opacity-60">
                <AlertCircle size={24} className="text-error mb-1" />
                <span>Failed to load team data</span>
              </div>
            ) : [...(bandwidthData || [])].filter(m => m.bandwidth > 0).length > 0 ? (
              [...(bandwidthData || [])]
              .filter(m => m.bandwidth > 0)
              .sort((a, b) => a.bandwidth - b.bandwidth)
              .map((member, index) => {
                const bw = member.bandwidth;
                return (
                  <div key={`${member.username}-${index}`} title={member.name} className="bg-white p-3 rounded-2xl flex items-center gap-4 group hover:shadow-sm transition-shadow">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-high relative border border-outline-variant/10">
                      <img 
                        src={getProfileImage(member.username)} 
                        alt={member.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${member.username}/100/100`;
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center -z-10 text-[10px] font-bold text-on-surface-variant">
                        {member.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden shadow-inner border border-outline-variant/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${bw}%` }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.05 }}
                          className={`h-full rounded-full shadow-xs ${
                            bw > 80 ? 'bg-linear-to-r from-error/60 to-error' : bw >= 40 ? 'bg-linear-to-r from-amber-400 to-amber-600' : 'bg-linear-to-r from-green-400 to-green-600'
                          }`}
                        />
                      </div>
                      <span className={`text-[11px] font-bold min-w-[32px] text-right ${
                        bw > 80 ? 'text-error' : bw >= 40 ? 'text-amber-500' : 'text-green-600'
                      }`}>
                        {bw}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-on-surface-variant font-medium opacity-60">
                No active members found.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content Goals Table Widget */}
      <section className="grid grid-cols-1 gap-8">
        <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10">
          <div className="px-8 py-6 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/5">
            <h4 className="font-bold text-on-surface flex items-center gap-3">
              <Flag size={20} className="text-primary" />
              <span>Active Content Goals</span>
            </h4>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Year Filter */}
              <select 
                value={tableYear}
                onChange={(e) => {
                  setTableYear(e.target.value);
                  setTablePage(1);
                }}
                className="bg-surface-container-low border-none rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/10 outline-none"
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Quarter Filter */}
              <select 
                value={tableQuarter}
                onChange={(e) => {
                  setTableQuarter(e.target.value);
                  setTablePage(1);
                }}
                className="bg-surface-container-low border-none rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/10 outline-none"
              >
                {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>

              {/* Username Search */}
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input 
                  type="text"
                  placeholder="Filter by name..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setTablePage(1);
                  }}
                  className="bg-surface-container-low border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/10 outline-none w-full sm:w-48 placeholder:text-on-surface-variant/30"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest/50 text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                  <th className="px-8 py-4">Goal Title</th>
                  <th className="px-4 py-4">Assignee</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Quarter/Year</th>
                  <th className="px-4 py-4">Progress</th>
                  <th className="px-8 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {goalsError ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant font-medium">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={24} className="text-error" />
                        <span>Failed to load goals</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedGoals.length > 0 ? (
                  paginatedGoals.map((goal, index) => (
                    <tr key={`${goal.id}-${index}`} className="border-b border-outline-variant/5 hover:bg-surface-container-lowest transition-colors">
                      <td className="px-8 py-4">
                        <h5 className="text-sm font-bold text-on-surface line-clamp-2 leading-tight" title={goal.title}>{goal.title}</h5>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-surface-container flex-shrink-0">
                            {goal.assignee_username ? (
                              <img 
                                src={getProfileImage(goal.assignee_username)} 
                                alt={goal.assignee}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${goal.assignee_username}`;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                                {goal.assignee?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-on-surface">{goal.assignee}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {goal.type === 'blog' ? (
                            <FileText size={14} className="text-secondary" />
                          ) : (
                            <Video size={14} className="text-primary" />
                          )}
                          <span className="text-xs font-bold capitalize text-on-surface-variant">{goal.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-on-surface-variant">
                        {goal.quarter} {goal.year}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden shadow-inner border border-outline-variant/5">
                            <div className="bg-linear-to-r from-primary/70 to-primary h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${goal.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-on-surface-variant">{goal.progress}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                          goal.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                          goal.status === 'In Progress' ? 'bg-primary-container text-primary' :
                          'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {goal.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant font-medium italic opacity-60">
                      No active goals found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalTablePages > 1 && (
            <div className="px-8 py-4 bg-white border-t border-outline-variant/5 flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant">
                Showing {((tablePage - 1) * itemsPerPage) + 1} to {Math.min(tablePage * itemsPerPage, tableFilteredGoals.length)} of {tableFilteredGoals.length}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setTablePage(prev => Math.max(1, prev - 1))}
                  disabled={tablePage === 1}
                  className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalTablePages) }, (_, i) => {
                    // Simple pagination logic to show current window
                    let pageNum = tablePage <= 3 ? i + 1 : 
                                 tablePage >= totalTablePages - 2 ? totalTablePages - 4 + i : 
                                 tablePage - 2 + i;
                    
                    if (pageNum < 1) pageNum = i + 1;
                    if (pageNum > totalTablePages) return null;

                    return (
                      <button 
                        key={pageNum}
                        onClick={() => setTablePage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                          tablePage === pageNum ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setTablePage(prev => Math.min(totalTablePages, prev + 1))}
                  disabled={tablePage === totalTablePages}
                  className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
