import { LayoutDashboard, Users, Target, History, ShieldCheck, Clock, Lightbulb, CheckSquare, LogOut, X, UserCog, Users2, ChevronLeft, User } from 'lucide-react';
import { View } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { setGlobalLeadId, teamService } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { getProfileImage } from '../utils/userUtils';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  const { logout, user } = useAuth();
  const { selectedLeadId, setSelectedLeadId } = useFilter();

  const isManager = user?.position === 'manager';
  const isSuperAdmin = user?.position === 'superadmin';

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => teamService.getLeads(),
    enabled: isManager && !!selectedLeadId
  });

  const selectedLead = leads?.find(l => l.username === selectedLeadId);

  const isEmployeeOrLead = user?.position === 'employee' || user?.position === 'lead';
  const showManagerLayout = isManager && !selectedLeadId;

  const normalMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'team', label: 'Team Directory', icon: Users },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb },
    { id: 'goals', label: 'Quarterly Goals', icon: Target },
    { id: 'weekly-updates', label: 'Weekly Updates', icon: History },
    { id: 'shifts', label: 'Shift Logs', icon: Clock },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  ] as const;

  const managerMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-team', label: 'My Team', icon: Users2 },
  ] as const;

  const superAdminMenuItems = [
    { id: 'role-assignment', label: 'Position Assignment', icon: UserCog },
  ] as const;

  let menuItems: readonly { id: string; label: string; icon: any }[] = normalMenuItems;

  if (isSuperAdmin) {
    menuItems = superAdminMenuItems;
  } else if (isManager) {
    menuItems = selectedLeadId ? normalMenuItems : managerMenuItems;
  }

  const handleLeadReset = () => {
    setSelectedLeadId(null);
    setGlobalLeadId(null);
    onViewChange('my-team');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-surface-container-low flex flex-col py-8 px-4 z-50 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between px-4 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-on-surface tracking-tighter">Team Management</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-60">
                {isSuperAdmin ? 'Admin' : isManager ? 'Manager' : user?.position === 'lead' ? 'Lead' : 'User'} Console
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 lg:hidden text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {isManager && selectedLeadId && (
          <div className="px-2 mb-6">
            <button 
              onClick={handleLeadReset}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all"
            >
              <ChevronLeft size={14} />
              <span>Back to My Team</span>
            </button>
            <div className="mt-2 p-3 bg-white rounded-2xl shadow-xs border border-primary/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex-shrink-0 border border-primary/5">
                <img 
                  src={getProfileImage(selectedLeadId)} 
                  alt={selectedLead?.name || selectedLeadId}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedLeadId}`;
                  }}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant opacity-60 font-bold mb-0.5">Viewing the team</p>
                <p className="text-xs font-bold text-primary truncate">{selectedLead?.name || selectedLeadId}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id as View);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'text-primary font-semibold bg-white shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/50'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'} />
                <span className="text-sm tracking-tight">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute right-0 w-1 h-6 bg-primary rounded-l-full"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
