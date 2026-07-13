import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SystemSettingsPage from "../src/pages/admin/SystemSettingsPage";
import { AuthProvider } from "../src/context/AuthContext";

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

const renderSystemSettingsPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <SystemSettingsPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("SystemSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderSystemSettingsPage();
    expect(document.body).toBeInTheDocument();
  });

  it("renders system settings page content", () => {
    renderSystemSettingsPage();
    expect(screen.getByText("System Settings")).toBeInTheDocument();
  });
});
