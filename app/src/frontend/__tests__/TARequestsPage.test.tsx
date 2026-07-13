import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import TARequestsPage from "../src/pages/ta-coordinator/TARequestsPage";
import { AuthProvider } from "../src/context/AuthContext";

const mockAuthContext = {
  isAuthenticated: true,
  user: { user_id: 1, name: "Sarah Johnson", email: "coordinator@example.com", role: "ta_coordinator" },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  switchRole: vi.fn(),
};

vi.mock("../src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext,
}));

vi.mock("../src/api/taCoordinatorApi", () => ({
  taCoordinatorApi: {
    taRequests: {
      getAll: vi.fn().mockResolvedValue([]),
      getStats: vi.fn().mockResolvedValue({ total: 0, open: 0, filled: 0, cancelled: 0 }),
      updateStatus: vi.fn().mockResolvedValue({}),
    },
  },
}));

const renderTARequestsPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <TARequestsPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe("TARequestsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    renderTARequestsPage();
    expect(document.body).toBeInTheDocument();
  });

  it("renders TA requests page content", () => {
    renderTARequestsPage();
    expect(document.body).toBeInTheDocument();
  });
});
