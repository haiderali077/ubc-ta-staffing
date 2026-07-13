import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { RegisterPage } from "../src/pages/auth/RegisterPage";
import { ThemeProvider } from "../src/context/ThemeContext";

let alertSpy: ReturnType<typeof vi.spyOn>;
let consoleSpy: ReturnType<typeof vi.spyOn>;

const renderRegisterPage = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <RegisterPage />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe("RegisterPage", () => {
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
  });
  afterEach(() => {
    alertSpy.mockClear();
    consoleSpy.mockClear();
    vi.restoreAllMocks();
  });

  it("renders registration form with all required elements", () => {
    renderRegisterPage();
    expect(screen.getByText("Create Your Student Account")).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/student number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("has correct link to login page", () => {
    renderRegisterPage();
    const loginLink = screen.getByRole("link", { name: /sign in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("has proper form validation attributes", () => {
    renderRegisterPage();
    const emailInput = screen.getByLabelText(/email/i);
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    const studentNumberInput = screen.getByLabelText(/student number/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("required");
    expect(firstNameInput).toHaveAttribute("required");
    expect(lastNameInput).toHaveAttribute("required");
    expect(studentNumberInput).toHaveAttribute("required");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("required");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("required");
  });
});
