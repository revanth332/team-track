import { TeamMember, ShiftLog, ContentGoal, WeeklyUpdateApi } from './types';

export const MEMBERS: TeamMember[] = [
  {
    id: '1',
    name: 'Marcus Chen',
    username: 'mchen',
    email: 'marcus.chen@company.com',
    empid: '1001',
    role: 'Lead Developer',
    position: 'lead',
    active_projects: ['Core Engine', 'Security Audit'],
    skills: ['React', 'Rust', 'AWS'],
    shift_start: '09:00:00',
    shift_end: '17:00:00',
    birthday: '1990-01-01'
  },
  {
    id: '2',
    name: 'Elena Rodriguez',
    username: 'erodriguez',
    email: 'elena.r@company.com',
    empid: '1002',
    role: 'UI Designer',
    position: 'employee',
    active_projects: ['Team Redesign'],
    skills: ['Figma', 'Tailwind', 'Cinema 4D'],
    shift_start: '08:00:00',
    shift_end: '16:00:00',
    birthday: '1992-05-12'
  },
  {
    id: '3',
    name: 'Jordan Smith',
    username: 'jsmith',
    email: 'jordan.s@company.com',
    empid: '1003',
    role: 'Product Manager',
    position: 'manager',
    active_projects: ['Roadmap 2024', 'User Growth'],
    skills: ['Jira', 'SQL', 'User Research'],
    shift_start: '09:00:00',
    shift_end: '17:00:00',
    birthday: '1988-11-20'
  },
  {
    id: '4',
    name: 'Sarah Jenkins',
    username: 'sjenkins',
    email: 'sarah.j@company.com',
    empid: '1004',
    role: 'Lead Architect',
    position: 'lead',
    active_projects: ['Cloud Architecture'],
    skills: ['K8s', 'Go', 'Terraform'],
    shift_start: '09:00:00',
    shift_end: '17:00:00',
    birthday: '1985-03-15'
  },
  {
    id: '5',
    name: 'Kevin Wright',
    username: 'kwright',
    email: 'kevin.w@company.com',
    empid: '1005',
    role: 'Executive Director',
    position: 'manager',
    active_projects: ['Stakeholder Review'],
    skills: ['Strategy', 'Leadership'],
    shift_start: '09:00:00',
    shift_end: '17:00:00',
    birthday: '1980-07-30'
  }
];

export const SHIFT_CHANGES: ShiftLog[] = [
  {
    id: '1234567890.0',
    name: 'Jane Doe',
    date: '15/4/2026',
    actual_shift: '09:00:00 - 17:00:00',
    worked_shift: '11:00:00 - 19:00:00',
    project: 'Project Alpha',
    reason: 'Reason for shift change',
    lead_approval: 'Approved',
    hr_verification: 'Yes',
    manager_approval: 'Approved',
    manager_remarks: "Manager's comments",
    lead_hr_comments: "HR/Lead's comments"
  },
  {
    id: '5060',
    name: 'Marcus Chen',
    date: '10/4/2026',
    actual_shift: '09:00:00 - 17:00:00',
    worked_shift: '11:00:00 - 19:00:00',
    project: 'Core Engine',
    reason: 'Technical meeting',
    lead_approval: 'Pending',
    hr_verification: 'No',
    manager_approval: 'Pending',
    manager_remarks: '',
    lead_hr_comments: ''
  }
];

export const CONTENT_GOALS: ContentGoal[] = [
  {
    id: '1',
    title: 'Product Roadmap Q2 Blog',
    status: 'in-progress',
    dueDate: '2d',
    description: 'Drafting stage',
    type: 'article'
  },
  {
    id: '2',
    title: 'Team Platform Overview Video',
    status: 'completed',
    description: 'Final edit approved',
    type: 'video'
  },
  {
    id: '3',
    title: 'Engineering Culture Post',
    status: 'in-progress',
    description: 'Content gathered',
    type: 'article'
  }
];

export const WEEKLY_UPDATES: WeeklyUpdateApi[] = [
  {
    id: '1',
    username: 'mchen',
    name: 'Marcus Chen',
    empid: '1001',
    role: 'Lead Developer',
    week_end_date: '2026-04-06',
    created_at: '2026-04-10T19:31:31.382Z',
    projects: [{
      project_name: 'Core Engine',
      client: 'Internal',
      task_description: 'Finalized the UI designs for the MVP and merged the authentication PR.',
      role: 'Lead Developer'
    }]
  },
  {
    id: '2',
    username: 'sjenkins',
    name: 'Sarah Jenkins',
    empid: '1004',
    role: 'Lead Architect',
    week_end_date: '2026-04-06',
    created_at: '2026-04-10T19:31:31.382Z',
    projects: [{
      project_name: 'Cloud Migration',
      client: 'Enterprise Client A',
      task_description: 'Resolved performance bottlenecks in the analytics engine. New queries are 40% faster.',
      role: 'Lead Architect'
    }]
  },
  {
    id: '3',
    username: 'erodriguez',
    name: 'Elena Rodriguez',
    empid: '1002',
    role: 'UI Designer',
    week_end_date: '2026-04-06',
    created_at: '2026-04-10T19:31:31.382Z',
    projects: [{
      project_name: 'Team Redesign',
      client: 'Internal',
      task_description: 'Completed initial exploration for dark mode theme and created 15 new system icons.',
      role: 'UI Designer'
    }]
  }
];
