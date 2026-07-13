import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../src/components/ProtectedRoute";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
const mockAuthContext = {
  isAuthenticated: false,
  user: null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
};

vi.mock("../src/context/AuthContext", async () => {
  const actual = await vi.importActual("../src/context/AuthContext");
  return {
    ...actual,
    useAuth: () => mockAuthContext,
  };
});

const renderProtectedRoute = (children: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <ProtectedRoute>{children}</ProtectedRoute>
    </BrowserRouter>
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
  });

  describe("Loading State", () => {
    it("shows loading spinner when authentication is being checked", () => {
      mockAuthContext.loading = true;
      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Authentication Check", () => {
    it("renders children when user is authenticated", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = { id: 1, email: "test@test.com", role: "student" };

      renderProtectedRoute(<div>Protected Content</div>);

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });
});
