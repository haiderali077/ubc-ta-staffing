import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { LoginPage } from "../src/pages/auth/LoginPage";
import { AuthProvider } from "../src/context/AuthContext";
import { ThemeProvider } from "../src/context/ThemeContext";

let alertSpy: ReturnType<typeof vi.spyOn>;
let consoleSpy: ReturnType<typeof vi.spyOn>;

// Mock the auth context
const mockAuthContext = {
  isAuthenticated: false,
  user: null,
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

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe("LoginPage", () => {
  beforeEach(() => {
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    // Reset mock auth context
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
    mockAuthContext.login.mockReset();
  });
  
  afterEach(() => {
    alertSpy.mockClear();
    consoleSpy.mockClear();
    vi.restoreAllMocks();
  });

  it("renders login form with all required elements", () => {
    renderLoginPage();
    expect(screen.getByText("Welcome to AllocAid")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create an account/i })).toBeInTheDocument();
  });

  it("allows user to input email and password", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("submits form with correct data when form is submitted", async () => {
    mockAuthContext.login.mockResolvedValue({ success: true });
    
    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    const submitButton = screen.getByRole("button", { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockAuthContext.login).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });

  it("prevents form submission without required fields", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    const submitButton = screen.getByRole("button", { name: /sign in/i });
    await user.click(submitButton);
    expect(mockAuthContext.login).not.toHaveBeenCalled();
  });

  it("has correct links to other pages", () => {
    renderLoginPage();
    const signUpLink = screen.getByRole("link", { name: /create an account/i });
    expect(signUpLink).toHaveAttribute("href", "/register");
  });

  it("has proper form validation attributes", () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("required");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("required");
  });

  it("displays placeholder text correctly", () => {
    renderLoginPage();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(emailInput).toHaveAttribute("placeholder", "example@student.ubc.ca");
    expect(passwordInput).toHaveAttribute("placeholder", "Enter your password");
  });
});
