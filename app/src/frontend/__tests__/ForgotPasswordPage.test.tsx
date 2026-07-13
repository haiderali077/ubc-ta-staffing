import React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { ForgotPasswordPage } from "../src/pages/auth/ForgotPasswordPage";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const renderForgotPasswordPage = () => {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  );
};

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the forgot password form", () => {
    renderForgotPasswordPage();

    expect(screen.getByText("Forgot Your Password?")).toBeInTheDocument();

    expect(
      screen.getByText(
        "Enter your email address and we'll send you a reset code"
      )
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /send reset code/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /back to login/i })
    ).toBeInTheDocument();
  });

  it("allows user to input email address", async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "test@student.ubc.ca");

    expect(emailInput).toHaveValue("test@student.ubc.ca");
  });

  it("submits form and shows success state", async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "If the email exists in our system, a password reset link has been sent." })
    });

    const user = userEvent.setup();
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send reset code/i,
    });

    await user.type(emailInput, "test@student.ubc.ca");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: "test@student.ubc.ca" }),
          credentials: "include"
        }
      );
    });

    expect(screen.getByText("Check Your Email")).toBeInTheDocument();
    expect(
      screen.getByText(
        "If an account exists with that email, we've sent a 6-digit reset code."
      )
    ).toBeInTheDocument();
  });

  it("hides form after successful submission", async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "If the email exists in our system, a password reset link has been sent." })
    });

    const user = userEvent.setup();
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send reset code/i,
    });

    await user.type(emailInput, "test@student.ubc.ca");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /send reset code/i })
      ).not.toBeInTheDocument();
    });
  });

  it("prevents form submission without email", async () => {
    const user = userEvent.setup();
    renderForgotPasswordPage();

    const submitButton = screen.getByRole("button", {
      name: /send reset code/i,
    });

    await user.click(submitButton);

    expect(mockFetch).not.toHaveBeenCalled();

    expect(screen.getByText("Forgot Your Password?")).toBeInTheDocument();
  });

  it("has correct link back to login page", () => {
    renderForgotPasswordPage();

    const backToLoginLink = screen.getByRole("link", {
      name: /back to login/i,
    });
    expect(backToLoginLink).toHaveAttribute("href", "/login");
  });

  it("has proper form validation attributes", () => {
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email/i);

    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("required");
  });

  it("displays placeholder text correctly", () => {
    renderForgotPasswordPage();

    const emailInput = screen.getByPlaceholderText("Email address");
    expect(emailInput).toBeInTheDocument();
  });

  it("shows success message with the correct email address", async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "If the email exists in our system, a password reset link has been sent." })
    });

    const user = userEvent.setup();
    renderForgotPasswordPage();

    const testEmail = "john.doe@student.ubc.ca";
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send reset code/i,
    });

    await user.type(emailInput, testEmail);
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "If an account exists with that email, we've sent a 6-digit reset code."
        )
      ).toBeInTheDocument();
    });
  });

  it("maintains success state after submission", async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "If the email exists in our system, a password reset link has been sent." })
    });

    const user = userEvent.setup();
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send reset code/i,
    });

    await user.type(emailInput, "test@student.ubc.ca");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check Your Email")).toBeInTheDocument();
    });

    expect(screen.getByText("Check Your Email")).toBeInTheDocument();
    expect(screen.queryByText("Forgot Your Password?")).not.toBeInTheDocument();
  });

  it("still shows back to login link in success state", async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "If the email exists in our system, a password reset link has been sent." })
    });

    const user = userEvent.setup();
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send reset code/i,
    });

    await user.type(emailInput, "test@student.ubc.ca");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Check Your Email")).toBeInTheDocument();
    });

    // The success state doesn't show the back to login link, so we should expect it to not be there
    expect(
      screen.queryByRole("link", { name: /back to login/i })
    ).not.toBeInTheDocument();
  });
});
