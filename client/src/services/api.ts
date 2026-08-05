/// <reference types="vite/client" />
import axios from 'axios';
import { TeamMember, UserCreate, UserRegister, Position, PaginatedUserResponse, ShiftLog, ShiftLogCreate, WeeklyUpdateApi, WeeklyUpdateApiCreate, Idea, IdeaCreate, LoginCredentials, LoginResponse, QuarterlyGoal, QuarterlyGoalCreate, Task, TaskCreate, TaskUpdate, TaskSubmission, TaskReview, PaginatedResponse } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let globalLeadId: string | null = null;

export const setGlobalLeadId = (id: string | null) => {
  globalLeadId = id;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (globalLeadId && config.method === 'get') {
    config.params = { ...config.params, lead_id: globalLeadId };
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/api/v1/auth/login') || 
                          error.config?.url?.includes('/api/v1/auth/register');
                          
    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('access_token');
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/login', credentials);
    return response.data;
  },
  register: async (userData: UserRegister): Promise<LoginResponse> => {
    const response = await api.post('/api/v1/auth/register', userData);
    return response.data;
  },
  updatePassword: async (passwordData: any): Promise<any> => {
    const response = await api.put('/api/v1/auth/password', passwordData);
    return response.data;
  },
  resetPassword: async (username: string): Promise<any> => {
    const response = await api.post('/api/v1/auth/reset-password', { username });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
  },
};

export const taskService = {
  getTasks: async (filters?: { username?: string; status?: string; page?: number; per_page?: number }): Promise<PaginatedResponse<Task>> => {
    const params = new URLSearchParams();
    if (filters?.username) params.append('username', filters.username);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    
    const response = await api.get(`/api/v1/tasks/${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
  getTask: async (id: string): Promise<Task> => {
    const response = await api.get(`/api/v1/tasks/${id}`);
    return response.data;
  },
  createTask: async (taskData: TaskCreate): Promise<Task> => {
    const response = await api.post('/api/v1/tasks/', taskData);
    return response.data;
  },
  updateTask: async (id: string, taskData: TaskUpdate): Promise<Task> => {
    const response = await api.put(`/api/v1/tasks/${id}`, taskData);
    return response.data;
  },
  deleteTask: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/tasks/${id}`);
  },
  submitTask: async (id: string, submission: TaskSubmission): Promise<Task> => {
    const response = await api.post(`/api/v1/tasks/${id}/submit`, submission);
    return response.data;
  },
  reviewTask: async (id: string, review: TaskReview): Promise<Task> => {
    const response = await api.post(`/api/v1/tasks/${id}/review`, review);
    return response.data;
  },
};

export const teamService = {
  getMembers: async (lead_id?: string): Promise<TeamMember[]> => {
    const params = new URLSearchParams();
    if (lead_id) params.append('lead_id', lead_id);
    const response = await api.get(`/api/v1/users/${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
  getAllUsers: async (filters?: { position?: string; name?: string; page?: number; limit?: number }): Promise<PaginatedUserResponse> => {
    const params = new URLSearchParams();
    if (filters?.position && filters.position !== 'All') params.append('position', filters.position);
    if (filters?.name) params.append('name', filters.name);
    if (filters?.page) params.append('page', (filters.page || 1).toString());
    if (filters?.limit) params.append('limit', (filters.limit || 10).toString());
    
    const response = await api.get(`/api/v1/users/all${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
  getMember: async (id: string): Promise<TeamMember> => {
    const response = await api.get(`/api/v1/users/${id}`);
    return response.data;
  },
  getUserDetail: async (): Promise<TeamMember> => {
    const response = await api.get('/api/v1/users/detail');
    return response.data;
  },
  createMember: async (userData: UserCreate): Promise<TeamMember> => {
    const response = await api.post('/api/v1/users/', userData);
    return response.data;
  },
  updateMember: async (id: string, userData: UserCreate): Promise<TeamMember> => {
    const response = await api.put(`/api/v1/users/${id}`, userData);
    return response.data;
  },
  getUnassignedUsers: async (filters?: { position?: string }): Promise<{ name: string; username: string }[]> => {
    const params = new URLSearchParams();
    if (filters?.position) params.append('position', filters.position);
    const response = await api.get(`/api/v1/users/unassigned${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
  assignMembers: async (data: { usernames: string[]; lead_id?: string; manager_id?: string }): Promise<any> => {
    const response = await api.post('/api/v1/users/assign', data);
    return response.data;
  },
  deleteMember: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/users/${id}`);
  },
  deassignMember: async (username: string): Promise<any> => {
    const response = await api.post('/api/v1/users/deassign', { username });
    return response.data;
  },
  getLeads: async (): Promise<TeamMember[]> => {
    const response = await api.get('/api/v1/users/leads');
    return response.data;
  },
  assignPosition: async (username: string, position: Position): Promise<any> => {
    const response = await api.post('/api/v1/users/assign-position', { username, position });
    return response.data;
  },
  assignLead: async (username: string, manager_id: string): Promise<any> => {
    const response = await api.post('/api/v1/users/assign', { usernames: [username], manager_id });
    return response.data;
  },
  deassignLead: async (username: string): Promise<any> => {
    const response = await api.post('/api/v1/users/deassign', { username });
    return response.data;
  },
  getMemberBandwidth: async (lead_id?: string): Promise<{ name: string; username: string; bandwidth: number }[]> => {
    const params = new URLSearchParams();
    if (lead_id) params.append('lead_id', lead_id);
    const response = await api.get(`/api/v1/users/bandwidth${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
};

export const shiftService = {
  getShifts: async (filters?: { year?: string; month?: string; name?: string; date?: string; status?: string }): Promise<ShiftLog[]> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', filters.year);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.name) params.append('name', filters.name);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.status !== undefined) params.append('status', filters.status);
    
    const response = await api.get(`/api/v1/shifts/${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data.data;
  },
  createShift: async (shiftData: ShiftLogCreate): Promise<ShiftLog> => {
    const response = await api.post('/api/v1/shifts/', { 
      record: { ...shiftData, name: String(shiftData.name) } 
    });
    return response.data;
  },
  updateShift: async (name: string, date: string, data: Partial<ShiftLog>): Promise<ShiftLog> => {
    const response = await api.put(`/api/v1/shifts/?name=${name}&date=${date}`, { 
      record: { ...data } 
    });
    return response.data;
  },
  deleteShift: async (name: string, date: string): Promise<void> => {
    await api.delete(`/api/v1/shifts/?name=${name}&date=${date}`);
  },
};

export const weeklyUpdateService = {
  getUpdates: async (filters?: { week_end_date?: string; name?: string; title?: string }): Promise<WeeklyUpdateApi[]> => {
    const params = new URLSearchParams();
    if (filters?.week_end_date) params.append('week_end_date', filters.week_end_date);
    if (filters?.name) params.append('name', filters.name);
    if (filters?.title) params.append('title', filters.title);
    
    const response = await api.get(`/api/v1/updates/${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
  createUpdate: async (updateData: WeeklyUpdateApiCreate): Promise<WeeklyUpdateApi> => {
    const response = await api.post('/api/v1/updates/', updateData);
    return response.data;
  },
  updateUpdate: async (id: string, updateData: WeeklyUpdateApiCreate): Promise<WeeklyUpdateApi> => {
    const response = await api.put(`/api/v1/updates/${id}`, updateData);
    return response.data;
  },
  deleteUpdate: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/updates/${id}`);
  },
  seenUpdate: async (id: string): Promise<WeeklyUpdateApi> => {
    const response = await api.post(`/api/v1/updates/${id}/seen`);
    return response.data;
  },
};

export const ideaService = {
  getIdeas: async (filters?: { username?: string; title?: string; status?: string; tag?: string; page?: number; per_page?: number; lead_id?: string }): Promise<PaginatedResponse<Idea>> => {
    const params = new URLSearchParams();
    if (filters?.username) params.append('username', filters.username);
    if (filters?.title) params.append('title', filters.title);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.tag !== undefined) params.append('tag', filters.tag);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.per_page) params.append('per_page', filters.per_page.toString());
    if (filters?.lead_id) params.append('lead_id', filters.lead_id);
    
    const response = await api.get(`/api/v1/ideas/${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
  createIdea: async (ideaData: IdeaCreate): Promise<Idea> => {
    const response = await api.post('/api/v1/ideas/', ideaData);
    return response.data;
  },
  updateIdea: async (id: string, ideaData: IdeaCreate): Promise<Idea> => {
    const response = await api.put(`/api/v1/ideas/${id}`, ideaData);
    return response.data;
  },
  deleteIdea: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/ideas/${id}`);
  },
};

export const goalService = {
  getGoals: async (filters?: { username?: string; year?: string; quarter?: string; type?: string; lead_id?: string }): Promise<QuarterlyGoal[]> => {
    const params = new URLSearchParams();
    if (filters?.username) params.append('username', filters.username);
    if (filters?.year) params.append('year', filters.year);
    if (filters?.quarter) params.append('quarter', filters.quarter);
    if (filters?.type !== undefined) params.append('type', filters.type);
    if (filters?.lead_id) params.append('lead_id', filters.lead_id);
    
    const response = await api.get(`/api/v1/goals/${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },
  createGoal: async (goalData: QuarterlyGoalCreate): Promise<QuarterlyGoal> => {
    const response = await api.post('/api/v1/goals/', goalData);
    return response.data;
  },
  updateGoal: async (id: string, goalData: QuarterlyGoalCreate): Promise<QuarterlyGoal> => {
    const response = await api.put(`/api/v1/goals/${id}`, goalData);
    return response.data;
  },
  deleteGoal: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/goals/${id}`);
  },
};
