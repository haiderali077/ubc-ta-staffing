export type UserRole = 'student' | 'instructor' | 'admin' | 'ta_coordinator';

export interface User {
  user_id?: number;
  email: string;
  name: string;
  role: UserRole;
  major?: string;
  prev_roles?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole?: (role: UserRole) => void; // For testing/demo only
  checkForSessionTimeout: (response: Response) => boolean;
  checkSessionValidity: () => Promise<void>;
} 