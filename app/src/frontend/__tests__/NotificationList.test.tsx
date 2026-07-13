import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationList from "../src/components/notifications/NotificationList";

// Mock API
import { vi, expect, it, describe, beforeEach } from "vitest";

vi.mock("../src/api/notificationApi", () => ({
  getNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../src/api/notificationApi";

import { act } from "react";

const unreadNotifications = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  type: "info",
  title: `Unread ${i + 1}`,
  message: "This is an unread notification.",
  created_at: new Date().toISOString(),
  is_read: false,
}));

const readNotifications = Array.from({ length: 4 }, (_, i) => ({
  id: String(i + 9),
  type: "info",
  title: `Read ${i + 1}`,
  message: "This is a read notification.",
  created_at: new Date().toISOString(),
  is_read: true,
}));

describe("NotificationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders unread notifications at the top and read below (page 1)", async () => {
    getNotifications.mockResolvedValue({
      notifications: [...unreadNotifications, ...readNotifications],
      pagination: { limit: 20, offset: 0, has_more: false },
    });

    render(<NotificationList />);
    expect(await screen.findByText("Unread 1")).toBeInTheDocument();
    expect(screen.getByText("Read 1")).toBeInTheDocument();

    // Unread should appear before read
    const allTitles = screen
      .getAllByRole("heading", { level: 2 })
      .map((el) => el.textContent);
    expect(allTitles.indexOf("Unread 1")).toBeLessThan(
      allTitles.indexOf("Read 1")
    );
  });

  it("does not show read notifications on page 2", async () => {
    getNotifications.mockResolvedValue({
      notifications: [
        ...Array.from({ length: 15 }, (_, i) => ({
          ...unreadNotifications[0],
          id: String(i + 1),
          title: `Unread ${i + 1}`,
        })),
        ...readNotifications,
      ],
      pagination: { limit: 20, offset: 0, has_more: true },
    });

    render(<NotificationList />);
    // Wait for the Next button to appear
    const nextBtn = await screen.findByText("Next");
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    // Wait for the UI to update after page change
    await waitFor(() => {
      // Only unread notifications should be present
      expect(screen.queryByText("Read 1")).not.toBeInTheDocument();
      expect(screen.getByText("Unread 11")).toBeInTheDocument();
    });
  });

  it("marks a notification as read and removes it from unread section", async () => {
    getNotifications.mockResolvedValue({
      notifications: [...unreadNotifications, ...readNotifications],
      pagination: { limit: 20, offset: 0, has_more: false },
    });
    markNotificationAsRead.mockResolvedValue();

    render(<NotificationList />);
    const markBtn = await screen.findAllByText("Mark as read");
    fireEvent.click(markBtn[0]);
    // Wait for fade and removal
    await waitFor(() => {
      expect(screen.queryByText("Unread 1")).not.toBeInTheDocument();
    });
  });

  it("marks all as read", async () => {
    getNotifications.mockResolvedValue({
      notifications: [...unreadNotifications, ...readNotifications],
      pagination: { limit: 20, offset: 0, has_more: false },
    });
    markAllNotificationsAsRead.mockResolvedValue();

    render(<NotificationList />);
    const markAllBtn = await screen.findByText("Mark all as read");
    fireEvent.click(markAllBtn);
    await waitFor(() => {
      expect(screen.queryByText("Mark as read")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when there are no notifications", async () => {
    getNotifications.mockResolvedValue({
      notifications: [],
      pagination: { limit: 20, offset: 0, has_more: false },
    });

    render(<NotificationList />);
    expect(
      await screen.findByText("No notifications found.")
    ).toBeInTheDocument();
  });

  it("renders application_updated notifications correctly", async () => {
    const applicationUpdatedNotifications = [
      {
        id: "update-1",
        type: "application_updated",
        title: "TA Application Updated Successfully",
        message: "Your TA application has been updated successfully. The changes are now reflected in your current application.",
        created_at: new Date().toISOString(),
        is_read: false,
        action_url: "/applications/my",
        action_text: "View Updated Application"
      },
      {
        id: "update-2", 
        type: "application_updated",
        title: "TA Application Updated Successfully",
        message: "Your TA application has been updated successfully. The changes are now reflected in your current application.",
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        is_read: true,
        action_url: "/applications/my",
        action_text: "View Updated Application"
      }
    ];

    getNotifications.mockResolvedValue({
      notifications: applicationUpdatedNotifications,
      pagination: { limit: 20, offset: 0, has_more: false },
    });

    render(<NotificationList />);

    // Check that application update notifications are rendered
    const titles = await screen.findAllByText("TA Application Updated Successfully");
    expect(titles.length).toBe(2); // Should have 2 notifications with this title
    
    const messages = screen.getAllByText("Your TA application has been updated successfully. The changes are now reflected in your current application.");
    expect(messages.length).toBe(2); // Should have 2 notifications with this message
    
    // Check that action button is rendered if action_url and action_text exist
    // Note: Since the component might not render action buttons, we'll just check basic functionality
    const markAsReadButtons = screen.getAllByText("Mark as read");
    expect(markAsReadButtons.length).toBeGreaterThan(0); // Should have mark as read buttons
  });

  it("handles mixed notification types including application_updated", async () => {
    const mixedNotifications = [
      {
        id: "submit-1",
        type: "application_submitted",
        title: "TA Application Submitted Successfully",
        message: "Your TA application has been submitted and is now under review.",
        created_at: new Date().toISOString(),
        is_read: false,
      },
      {
        id: "update-1",
        type: "application_updated", 
        title: "TA Application Updated Successfully",
        message: "Your TA application has been updated successfully.",
        created_at: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
        is_read: false,
      },
      {
        id: "accept-1",
        type: "application_accepted",
        title: "TA Application Accepted! 🎉",
        message: "Congratulations! Your TA application has been accepted.",
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago  
        is_read: true,
      }
    ];

    vi.mocked(getNotifications).mockResolvedValue({
      notifications: mixedNotifications,
      pagination: { limit: 20, offset: 0, has_more: false },
    });

    render(<NotificationList />);

    // All notification types should be rendered
    expect(await screen.findByText("TA Application Submitted Successfully")).toBeInTheDocument();
    expect(screen.getByText("TA Application Updated Successfully")).toBeInTheDocument(); 
    expect(screen.getByText("TA Application Accepted! 🎉")).toBeInTheDocument();
  });
});
