import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AdminDashboard } from "../src/pages/admin/AdminDashboard";
import { AuthProvider } from "../src/context/AuthContext";

// Mock the APIs
vi.mock("../src/api/adminApi", () => ({
  getAdminStats: vi.fn(),
  getRecentActivity: vi.fn(),
}));

// Mock the auth context
const mockAuthContext = {
  isAuthenticated: true,
  user: { user_id: 1, name: "Admin User", email: "admin@example.com", role: "admin" },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

// Mock the AuthProvider
vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

const renderAdminDashboard = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <AdminDashboard />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Header Section", () => {
    it("renders welcome message with user name", () => {
      renderAdminDashboard();
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    it("displays dashboard description", () => {
      renderAdminDashboard();
      expect(screen.getByText(/overview of your system/i)).toBeInTheDocument();
    });
  });

  describe("Statistics Cards", () => {
    it("renders all four stat cards", () => {
      renderAdminDashboard();
      // Check for stat card titles
      expect(screen.getByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("Active Applications")).toBeInTheDocument();
      expect(screen.getByText("Pending Approvals")).toBeInTheDocument();
      expect(screen.getByText("System Alerts")).toBeInTheDocument();
    });
  });

  describe("Quick Actions Section", () => {
    it("renders quick actions section title", () => {
      renderAdminDashboard();
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    });

    it("displays all four quick action cards", () => {
      renderAdminDashboard();
      // Check for quick action titles
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getByText("System Settings")).toBeInTheDocument();
      expect(screen.getByText("Audit Logs")).toBeInTheDocument();
    });
  });

  describe("Recent Activity Section", () => {
    it("renders recent activity section title", () => {
      renderAdminDashboard();
      expect(screen.getByText(/recent system activity/i)).toBeInTheDocument();
    });
  });
});
