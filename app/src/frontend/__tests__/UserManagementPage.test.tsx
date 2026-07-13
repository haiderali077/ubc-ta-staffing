import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import UserManagementPage from "../src/pages/admin/UserManagementPage";
import { AuthProvider } from "../src/context/AuthContext";

const mockAuthContext = {
  isAuthenticated: true,
  user: { user_id: 1, name: "Admin User", email: "admin@example.com", role: "admin" },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

vi.mock("../src/api/adminApi", () => ({
  getAllUsers: vi.fn().mockResolvedValue({ 
    users: [
      {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "student",
        createdAt: "2024-01-01T00:00:00Z"
      }
    ]
  }),
  createUser: vi.fn(),
  updateUserRole: vi.fn(),
  deactivateUser: vi.fn(),
}));

const renderUserManagementPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <UserManagementPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("UserManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderUserManagementPage();
    expect(document.body).toBeInTheDocument();
  });

  it("renders user management page content", async () => {
    renderUserManagementPage();
    
    // Wait for the loading to complete and the content to appear
    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });
  });
});
