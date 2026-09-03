export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  start: string;
  prefix: string;
  userId: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export type IssueStatus =
  | "not_started"
  | "in_progress"
  | "review"
  | "testing"
  | "done"
  | "blocked";

export type SprintStatus = "planned" | "active" | "completed";

export interface Epic {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Sprint {
  id: number;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SprintStatus;
  created_at: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: "low" | "medium" | "high" | "urgent";
  sort_order: number;
  epic_id: number | null;
  sprint_id: number | null;
  created_by_user_id: string;
  assigned_user_id?: string;
  created_at: string;
  updated_at: string;
  created_by_user?: User;
  assigned_user?: User;
  tags?: Tag[];
  epic?: Pick<Epic, "id" | "name"> | null;
  sprint?: Pick<Sprint, "id" | "name" | "start_date" | "end_date" | "status"> | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IssueFilters {
  status?: string;
  epic_id?: string;
  sprint_id?: string;
  assigned_user_id?: string;
  tag_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}
