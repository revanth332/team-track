export type View = 'dashboard' | 'team' | 'goals' | 'shifts' | 'weekly-updates' | 'ideas' | 'tasks' | 'settings' | 'my-team' | 'role-assignment' | 'profile';

export type Position = 'employee' | 'lead' | 'manager' | 'superadmin';

export type TaskStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected';

export interface Task {
  id: string;
  title: string;
  problem_url?: string;
  description?: string;
  tags: string[];
  username: string;
  created_by: string;
  status: TaskStatus;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
  screenshot_url?: string;
  submission_notes?: string;
  links?: GoalLink[];
  reviewed_by?: string;
  reviewed_at?: string;
  review_comments?: string;
}

export interface TaskCreate {
  title: string;
  problem_url?: string;
  description?: string;
  tags: string[];
}

export interface TaskUpdate {
  title?: string;
  problem_url?: string;
  description?: string;
  tags?: string[];
  status?: TaskStatus;
}

export interface TaskSubmission {
  screenshot_url?: string;
  links?: GoalLink[];
  notes?: string;
}

export interface TaskReview {
  status: 'Approved' | 'Rejected';
  review_comments?: string;
}

export interface Update {
  id: string;
  member: TeamMember;
  timestamp: string;
  category: 'Product' | 'Engineering' | 'Design';
  content: string;
  likes: number;
}

export interface ActiveProject {
  title: string;
  description: string;
  is_active: boolean;
  occupancy: number;
  client: string;
  role: string;
}

export interface TeamMember {
  id: string;
  name: string;
  username: string;
  email: string;
  empid: string;
  role: string;
  position: Position;
  manager_id?: string | null;
  active_projects: (string | ActiveProject)[];
  bandwidth?: number;
  shift_start: string;
  shift_end: string;
  skills: string[];
  birthday: string | null;
  shift_sheet_name?: string;
}

export interface UserCreate {
  name: string;
  username: string;
  email: string;
  empid: string;
  role: string;
  position?: Position;
  active_projects?: (string | ActiveProject)[];
  bandwidth?: number;
  shift_start?: string;
  shift_end?: string;
  skills?: string[];
  birthday?: string | null;
  shift_sheet_name?: string;
}

export interface GoalLink {
  name: string;
  url: string;
}

export interface QuarterlyGoal {
  id: string;
  assignee: string;
  assignee_username?: string;
  title: string;
  description: string;
  links: GoalLink[];
  type: 'blog' | 'video';
  status: string;
  progress: number;
  idea_id: string;
  year: number;
  quarter: string;
  created_at: string;
}

export interface QuarterlyGoalCreate {
  assignee: string;
  assignee_username?: string;
  title: string;
  description: string;
  links: GoalLink[];
  type: 'blog' | 'video';
  status: string;
  progress: number;
  idea_id: string;
  year: number;
  quarter: string;
}

export interface ShiftLog {
  id: string;
  name: string;
  date: string;
  actual_shift: string;
  worked_shift: string;
  project: string;
  reason: string;
  lead_approval: string;
  hr_verification: string;
  manager_approval: string;
  manager_remarks: string;
  lead_hr_comments: string;
}

export interface ShiftLogCreate {
  name: string;
  date: string;
  actual_shift: string;
  worked_shift: string;
  project: string;
  reason: string;
  lead_approval: string;
  hr_verification: string;
  manager_approval: string;
  manager_remarks: string;
  lead_hr_comments: string;
}

export interface ShiftLogResponse {
  status: string;
  count: number;
  data: ShiftLog[];
}

export interface WeeklyUpdateProjectInfo {
  client: string;
  project_name: string;
  task_description: string;
  role: string;
}

export interface WeeklyUpdateApi {
  id: string;
  username: string;
  name: string;
  empid: string;
  role: string;
  projects: WeeklyUpdateProjectInfo[];
  week_end_date: string;
  occupancy?: number;
  seen_by_lead?: boolean;
  created_at: string;
}

export interface WeeklyUpdateApiCreate {
  username: string;
  name: string;
  role: string;
  projects: WeeklyUpdateProjectInfo[];
  week_end_date: string;
  occupancy?: number;
}

export interface ContentGoal {
  id: string;
  title: string;
  status: 'in-progress' | 'completed';
  dueDate?: string;
  description?: string;
  type: 'article' | 'video';
}

export interface Idea {
  id: string;
  username: string;
  added_by?: string | null;
  title: string;
  description: string;
  links: string[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Assigned';
  is_blog?: boolean;
  is_video?: boolean;
  blog_assignee?: string | null;
  video_assignee?: string | null;
  tags?: string[];
  created_at: string;
  year?: number;
  quarter?: string;
}

export interface IdeaCreate {
  username: string;
  added_by?: string | null;
  title: string;
  description: string;
  links: string[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Assigned';
  is_blog?: boolean;
  is_video?: boolean;
  blog_assignee?: string | null;
  video_assignee?: string | null;
  tags?: string[];
  year?: number;
  quarter?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserRegister {
  full_name: string;
  username: string;
  email: string;
  password: string;
}

export interface PaginatedUserResponse {
  users: TeamMember[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  status: string;
  count: number;
  total: number;
  page: number;
  per_page: number;
  data: T[];
}
