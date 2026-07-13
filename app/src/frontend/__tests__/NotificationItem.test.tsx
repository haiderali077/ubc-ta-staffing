// Tests for NotificationItem component: rendering, mark as read, fade-out, and edge cases.
/* eslint-disable @typescript-eslint/no-undef */
/* eslint-disable jest/expect-expect, jest/no-standalone-expect, jest/no-identical-title, jest/no-done-callback, jest/valid-title, jest/no-disabled-tests, jest/no-focused-tests, jest/no-test-callback, jest/no-conditional-expect, jest/no-deprecated-functions, jest/no-export, jest/no-interpolation-in-snapshots, jest/no-jasmine-globals, jest/no-mocks-import, jest/no-restricted-matchers, jest/no-try-expect, jest/prefer-called-with, jest/prefer-expect-assertions, jest/prefer-lowercase-title, jest/prefer-spy-on, jest/prefer-strict-equal, jest/prefer-todo, jest/require-hook, jest/require-to-throw-message, jest/valid-describe, jest/valid-expect, jest/valid-expect-in-promise */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NotificationItem from "../src/components/notifications/NotificationItem";
import { vi } from "vitest";

describe("NotificationItem", () => {
  const baseNotification = {
    id: 1,
    type: "info" as const,
    title: "Test Notification",
    message: "This is a test notification.",
    created_at: new Date("2024-01-01T12:00:00Z").toISOString(),
    is_read: false,
  };

  // Renders notification details (title, message, date)
  it("renders notification details", () => {
    render(<NotificationItem notification={baseNotification} />);
    expect(screen.getByText("Test Notification")).toBeInTheDocument();
    expect(
      screen.getByText("This is a test notification.")
    ).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  // Shows 'Mark as read' for unread notifications
  it("shows 'Mark as read' for unread notifications", () => {
    render(
      <NotificationItem
        notification={baseNotification}
        onMarkAsRead={() => {}}
      />
    );
    expect(screen.getByText("Mark as read")).toBeInTheDocument();
  });

  // Calls onMarkAsRead when button is clicked
  it("calls onMarkAsRead when button is clicked", () => {
    const onMarkAsRead = vi.fn();
    render(
      <NotificationItem
        notification={baseNotification}
        onMarkAsRead={onMarkAsRead}
      />
    );
    fireEvent.click(screen.getByText("Mark as read"));
    expect(onMarkAsRead).toHaveBeenCalledWith("1");
  });

  // Does not call onMarkAsRead if fading is true
  it("does not call onMarkAsRead if fading is true", () => {
    const onMarkAsRead = vi.fn();
    render(
      <NotificationItem
        notification={baseNotification}
        onMarkAsRead={onMarkAsRead}
        fading={true}
      />
    );
    const btn = screen.getByText("Mark as read");
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  // Does not show 'Mark as read' for read notifications
  it("does not show 'Mark as read' for read notifications", () => {
    render(
      <NotificationItem notification={{ ...baseNotification, is_read: true }} />
    );
    expect(screen.queryByText("Mark as read")).not.toBeInTheDocument();
  });

  // Applies fade-out class when fading is true
  it("applies fade-out class when fading is true", () => {
    const { container } = render(
      <NotificationItem notification={baseNotification} fading={true} />
    );
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).toMatch(/opacity-0/);
  });
});
