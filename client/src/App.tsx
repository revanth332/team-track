/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import TeamDirectory from './components/TeamDirectory';
import GoalsTracker from './components/GoalsTracker';
import ShiftLogs from './components/ShiftLogs';
import WeeklyUpdates from './components/WeeklyUpdates';
import Ideas from './components/Ideas';
import Tasks from './components/Tasks';
import MyTeam from './components/MyTeam';
import PositionAssignment from './components/PositionAssignment';
import Profile from './components/Profile';
import LoginPage from './components/LoginPage';
import ShiftChangeModal from './components/Modals/ShiftChangeModal';
import WeeklyAchievementModal from './components/Modals/WeeklyAchievementModal';
import UpdatePasswordModal from './components/Modals/UpdatePasswordModal';
import { View } from './types';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from './services/api';
import { useAuth } from './context/AuthContext';
import { useFilter } from './context/FilterContext';

export default function App() {
  const { user, login, isAuthenticated } = useAuth();
  const { selectedLeadId } = useFilter();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Set initial view for roles
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.position === 'superadmin') {
      if (currentView !== 'role-assignment') {
        setCurrentView('role-assignment');
      }
    } else if (user.position === 'manager' && !selectedLeadId) {
      const managerViews: View[] = ['my-team', 'dashboard'];
      if (!managerViews.includes(currentView)) {
        setCurrentView('my-team');
      }
    }
  }, [isAuthenticated, user, selectedLeadId, currentView]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => {}} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'team':
        return <TeamDirectory />;
      case 'goals':
        return <GoalsTracker />;
      case 'shifts':
        return <ShiftLogs onNavigateToProfile={() => setCurrentView('profile')} />;
      case 'weekly-updates':
        return <WeeklyUpdates onAddUpdate={() => setIsAchievementModalOpen(true)} />;
      case 'ideas':
        return <Ideas />;
      case 'tasks':
        return <Tasks />;
      case 'my-team':
        if (user?.position !== 'manager') return <Dashboard />;
        return <MyTeam onSelectLead={() => setCurrentView('dashboard')} />;
      case 'role-assignment':
        if (user?.position !== 'superadmin') return <Dashboard />;
        return <PositionAssignment />;
      case 'profile':
        if (user?.position !== 'employee' && user?.position !== 'lead') return <Dashboard />;
        return <Profile />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-on-surface-variant">
            <h2 className="text-2xl font-bold">Settings</h2>
            <p className="font-medium opacity-60">Configuration options coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="lg:ml-64 min-h-screen flex flex-col transition-all duration-300">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} onUpdatePasswordClick={() => setIsPasswordModalOpen(true)} onViewChange={setCurrentView} />
        
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <ShiftChangeModal 
        isOpen={isShiftModalOpen} 
        onClose={() => setIsShiftModalOpen(false)} 
      />
      <WeeklyAchievementModal 
        isOpen={isAchievementModalOpen} 
        onClose={() => setIsAchievementModalOpen(false)} 
      />
      <UpdatePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
