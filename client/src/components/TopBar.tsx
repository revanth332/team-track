import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, LogOut, User, Mail, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilter } from '../context/FilterContext';
import { getProfileImage } from '../utils/userUtils';
import { useQuery } from '@tanstack/react-query';
import { teamService } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';

import { View } from '../types';

interface TopBarProps {
  onMenuClick: () => void;
  onUpdatePasswordClick: () => void;
  onViewChange: (view: View) => void;
}

export default function TopBar({ onMenuClick, onUpdatePasswordClick, onViewChange }: TopBarProps) {
  const { user, logout } = useAuth();
  const isManager = user?.position === 'manager';
  const isEmployeeOrLead = user?.position === 'employee' || user?.position === 'lead';
  const { selectedAssignee, setSelectedAssignee, selectedLeadId } = useFilter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: members } = useQuery({
    queryKey: ['members', selectedLeadId],
    queryFn: () => teamService.getMembers(selectedLeadId || undefined),
    enabled: !isManager || !!selectedLeadId
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-16 w-full glass-effect flex items-center justify-between px-4 sm:px-8 border-b border-outline-variant/5">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2 lg:hidden text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors"
        >
          <Menu size={20} />
        </button>
        
        {(!isManager || !!selectedLeadId) && (
          <>
            <div className="flex items-center gap-2 ml-2 mr-1">
              <Search size={14} className="text-on-surface-variant/40" />
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hidden sm:block">Team</span>
            </div>
            
            <div className="flex items-center -space-x-2 overflow-hidden py-1">
              <button
                onClick={() => setSelectedAssignee(null)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all z-10 ${
                  selectedAssignee === null 
                    ? 'border-primary bg-primary text-white scale-110 shadow-md' 
                    : 'border-white bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                All
              </button>
              {members?.map((member, i) => (
                <button
                  key={member.id}
                  onClick={() => {
                    const isSelected = selectedAssignee?.username === member.username;
                    setSelectedAssignee(isSelected ? null : { username: member.username, name: member.name });
                  }}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all group ${
                    selectedAssignee?.username === member.username 
                      ? 'border-primary scale-110 z-20 shadow-md' 
                      : 'border-white hover:z-10 hover:scale-105'
                  }`}
                  style={{ zIndex: selectedAssignee?.username === member.username ? 20 : (members?.length || 0) - i }}
                  title={member.name}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary relative">
                    <img 
                      src={getProfileImage(member.username)} 
                      alt={member.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center -z-10">
                      {member.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {selectedAssignee && (
              <button 
                onClick={() => setSelectedAssignee(null)}
                className="text-[10px] font-bold text-primary hover:underline hidden sm:block"
              >
                Clear Filter
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-6" ref={popoverRef}>
        <div className="relative">
          <button 
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className="flex items-center gap-3 p-1 rounded-2xl hover:bg-surface-container transition-all group"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white shadow-sm flex items-center justify-center bg-primary/10 text-primary font-bold text-xs relative group-hover:ring-primary/20 transition-all">
              {user?.username ? (
                <img 
                  src={getProfileImage(user.username)} 
                  alt={user.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span className="absolute inset-0 flex items-center justify-center -z-10">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
          </button>

          <AnimatePresence>
            {isPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-3 w-72 bg-surface rounded-[2rem] border border-outline-variant/10 shadow-2xl overflow-hidden py-2"
              >
                <div className="px-6 py-4 border-b border-outline-variant/5 mb-2">
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <h4 className="font-black text-on-surface leading-tight">{user?.name}</h4>
                      <p className="text-xs font-bold text-primary">{user?.role}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <Mail size={14} className="opacity-40" />
                      <span className="text-[10px] sm:text-xs font-medium truncate">{user?.email}@miraclesoft.com</span>
                    </div>
                    <div className="flex items-center gap-3 text-on-surface-variant">
                      <Shield size={14} className="opacity-40" />
                      <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                        {user?.position === 'superadmin' ? 'Superadmin Controls' : user?.position === 'manager' ? 'Manager Privileges' : user?.position === 'lead' ? 'Lead Access' : 'Standard Access'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-2 space-y-1">
                  {isEmployeeOrLead && (
                    <button
                      onClick={() => {
                        setIsPopoverOpen(false);
                        onViewChange('profile');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-on-surface-variant hover:bg-surface-container transition-all group font-bold text-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <User size={16} />
                      </div>
                      <span>My Profile</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsPopoverOpen(false);
                      onUpdatePasswordClick();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-on-surface-variant hover:bg-surface-container transition-all group font-bold text-sm"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Key size={16} />
                    </div>
                    <span>Update Password</span>
                  </button>

                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-error hover:bg-error/5 transition-all group font-bold text-sm"
                  >
                    <div className="w-8 h-8 rounded-xl bg-error/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LogOut size={16} />
                    </div>
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
