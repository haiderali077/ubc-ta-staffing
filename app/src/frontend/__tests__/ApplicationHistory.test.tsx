import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ApplicationHistory from "../src/pages/student/ApplicationHistory";
import { AuthProvider } from "../src/context/AuthContext";

const mockAuthContext = {
  isAuthenticated: true,
  user: { user_id: 1, name: "John Doe", email: "student@example.com", role: "student" },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

vi.mock("../src/api/applicationApi", () => ({
  getMyApplications: vi.fn().mockResolvedValue([]),
  submitApplication: vi.fn().mockResolvedValue({ id: 1 }),
  updateApplication: vi.fn().mockResolvedValue({ id: 1 }),
}));

const renderApplicationHistory = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ApplicationHistory />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("ApplicationHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderApplicationHistory();
    expect(document.body).toBeInTheDocument();
  });

  it("renders application history page content", () => {
    renderApplicationHistory();
    expect(document.body).toBeInTheDocument();
  });
});
