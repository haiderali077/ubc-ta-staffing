import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationPreferences from "../src/components/notifications/NotificationPreferences";
import { vi } from "vitest";

vi.mock("../src/api/notificationApi", () => ({
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
}));

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../src/api/notificationApi";

describe("NotificationPreferences", () => {
  const prefs = {
    email_notifications: true,
    in_app_notifications: false,
    deadline_reminders: true,
    application_updates: true,
    allocation_updates: false,
    reminder_days_before: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Renders all toggles and number input
  it("renders all preference toggles and number input", async () => {
    getNotificationPreferences.mockResolvedValue(prefs);
    render(<NotificationPreferences />);
    expect(
      await screen.findByLabelText(/Email Notifications/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/In-App Notifications/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deadline Reminders/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Application Updates/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Allocation Updates/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reminder Days Before/i)).toBeInTheDocument();
  });

  // Loads preferences from API
  it("loads preferences from API", async () => {
    getNotificationPreferences.mockResolvedValue(prefs);
    render(<NotificationPreferences />);
    expect(await screen.findByDisplayValue("5")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Notifications/i)).toBeChecked();
    expect(screen.getByLabelText(/In-App Notifications/i)).not.toBeChecked();
  });

  // Allows toggling checkboxes and changing number
  it("allows toggling checkboxes and changing number", async () => {
    getNotificationPreferences.mockResolvedValue(prefs);
    render(<NotificationPreferences />);
    const emailToggle = await screen.findByLabelText(/Email Notifications/i);
    fireEvent.click(emailToggle);
    expect(emailToggle).not.toBeChecked();
    const numberInput = screen.getByLabelText(/Reminder Days Before/i);
    fireEvent.change(numberInput, { target: { value: "10" } });
    expect(numberInput).toHaveValue(10);
  });

  // Calls API to save preferences and shows success
  it("calls API to save preferences and shows success", async () => {
    getNotificationPreferences.mockResolvedValue(prefs);
    updateNotificationPreferences.mockResolvedValue({
      ...prefs,
      email_notifications: false,
    });
    render(<NotificationPreferences />);
    const emailToggle = await screen.findByLabelText(/Email Notifications/i);
    fireEvent.click(emailToggle);
    const saveBtn = screen.getByText(/Save Preferences/i);
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(updateNotificationPreferences).toHaveBeenCalled();
      expect(
        screen.getByText(/Preferences updated successfully/i)
      ).toBeInTheDocument();
    });
  });

  // Shows error if save fails
  it("shows error if save fails", async () => {
    getNotificationPreferences.mockResolvedValue(prefs);
    updateNotificationPreferences.mockRejectedValue(new Error("Failed"));
    render(<NotificationPreferences />);
    const saveBtn = await screen.findByText(/Save Preferences/i);
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to update preferences/i)
      ).toBeInTheDocument();
    });
  });

  // Shows loading state
  it("shows loading state", () => {
    getNotificationPreferences.mockReturnValue(new Promise(() => {}));
    const { container } = render(<NotificationPreferences />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  // Shows error if loading fails
  it("shows error if loading fails", async () => {
    getNotificationPreferences.mockRejectedValue(
      new Error("Failed to load preferences")
    );
    render(<NotificationPreferences />);
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load preferences/i)
      ).toBeInTheDocument();
    });
  });
});
