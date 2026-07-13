// Admin API functions for frontend
const API_BASE = 'http://localhost:8000/api';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin' | 'ta_coordinator';
  studentNumber?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: 'instructor' | 'ta_coordinator';
  temporaryPassword: string;
  departmentId?: number;
  notes?: string;
}

export interface UpdateRoleRequest {
  role: 'student' | 'instructor' | 'ta_coordinator';
}

// Get all users
export const getAllUsers = async (): Promise<{ users: AdminUser[] }> => {
  const response = await fetch(`${API_BASE}/admin/users`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  return response.json();
};

// Create new user (instructor/TA coordinator)
export const createUser = async (userData: CreateUserRequest): Promise<{ message: string; user: AdminUser; temporaryPassword: string }> => {
  const response = await fetch(`${API_BASE}/admin/users/create`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create user');
  }

  return response.json();
};

// Update user role
export const updateUserRole = async (userId: number, roleData: UpdateRoleRequest): Promise<{ message: string; user: AdminUser }> => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(roleData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details?.[0] || 'Failed to update user role');
  }

  return response.json();
};

// Deactivate user
export const deactivateUser = async (userId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to deactivate user');
  }

  return response.json();
};

// Activate user
export const activateUser = async (userId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/activate`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to activate user');
  }

  return response.json();
};
