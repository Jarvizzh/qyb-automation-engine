export interface TaskPreview {
  sender: string;
  tag: string;
  receiver: string;
  internal: boolean;
  start: number;
  limit: number;
}

export interface UserSession {
  mobile: string;
  uid: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  task_type?: string;
}

export interface StatsItem {
  employee_name: string;
  tag_name: string;
  user_count: number;
}

export interface GroupItem {
  id: number;
  name: string;
}

export interface GroupTaskItem {
  id: number;
  title: string;
}

export interface TaskContentItem {
  task_name: string;
  index: number;
  type: string;
  url: string;
}

export interface SopTemplateItem {
  id: number;
  name: string;
}

export interface SopUrlItem {
  day: number | string;
  type: string;
  title: string;
  url: string;
}

export interface RetentionReportItem {
  name: string;
  total: number;
  normal: number;
  lost: number;
  retention_rate: number;
}

