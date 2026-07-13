import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";
import {
  getUnreadCount,
  getNotificationPreferences,
  type NotificationPreferences,
} from "../../api/notificationApi";
import { getInstructorNotificationSummary } from "../../api/instructorNotificationApi";

interface NavItem {
  label: string;
  path: string;
  roles: UserRole[];
}

interface NavigationProps {
  vertical?: boolean;
}

const navItems: NavItem[] = [
  // Student navigation (simple, personal focus)
  { label: "Dashboard", path: "/dashboard", roles: ["student"] },
  { label: "Profile", path: "/profile", roles: ["student"] },
  { label: "Apply", path: "/apply", roles: ["student"] },
  {
    label: "My Applications",
    path: "/student/applications",
    roles: ["student"],
  },
  { label: "View Assignments", path: "/assignments", roles: ["student"] },
  { label: "Notifications", path: "/notifications", roles: ["student"] },

  // Instructor navigation (teaching + management focus)
  { label: "Dashboard", path: "/dashboard", roles: ["instructor"] },
  { label: "Submit Request", path: "/submit-request", roles: ["instructor"] },
  { label: "Assigned TAs", path: "/students", roles: ["instructor"] },
  { label: "Notifications", path: "/instructor/notifications", roles: ["instructor"] },



  // TA Coordinator navigation (TA allocation workflow focus) - Admin can also access
  {
    label: "Academic Terms",
    path: "/academic-terms",
    roles: ["ta_coordinator", "admin"],
  },
  {
    label: "Course Offerings",
    path: "/course-offerings",
    roles: ["ta_coordinator", "admin"],
  },
  {
    label: "Bulk Upload",
    path: "/admin/bulk-upload",
    roles: ["ta_coordinator", "admin"],
  },
  {
    label: "Instructor Assignment",
    path: "/instructor-assignment",
    roles: ["ta_coordinator", "admin"],
  },
  {
    label: "TA Requests",
    path: "/ta-requests",
    roles: ["ta_coordinator", "admin"],
  },
  {
    label: "Student Applications",
    path: "/student-applications",
    roles: ["ta_coordinator", "admin"],
  },
  {
    label: "Allocations",
    path: "/allocations",
    roles: ["ta_coordinator", "admin"],
  },
  { label: "Reports", path: "/reports", roles: ["ta_coordinator", "admin"] },

  // Admin navigation (system management focus)
  { label: "Dashboard", path: "/admin-dashboard", roles: ["admin"] },
  { label: "User Management", path: "/user-management", roles: ["admin"] },
  { label: "System Settings", path: "/system-settings", roles: ["admin"] },
  { label: "Audit Logs", path: "/audit-logs", roles: ["admin"] },
];

const publicNavItems: NavItem[] = [{ label: "Home", path: "/", roles: [] }];

export const Navigation: React.FC<NavigationProps> = ({ vertical = false }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState<number>(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>({});

  useEffect(() => {
    let mounted = true;
    if (isAuthenticated && user?.role === "student") {
      // Fetch both unread count and preferences for students
      Promise.all([
        getUnreadCount().catch(() => 0),
        getNotificationPreferences().catch(() => ({})),
      ]).then(([count, prefs]) => {
        if (mounted) {
          setUnread(count);
          setPreferences(prefs);
        }
      });
    } else if (isAuthenticated && user?.role === "instructor") {
      // Fetch unread count for instructors
      getInstructorNotificationSummary()
        .then((summary) => {
          if (mounted) {
            setUnread(summary.totalUnread);
            setPreferences({}); // Instructors don't have preference settings yet
          }
        })
        .catch(() => {
          if (mounted) {
            setUnread(0);
            setPreferences({});
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user]);

  const getVisibleNavItems = (): NavItem[] => {
    if (!isAuthenticated || !user) {
      return publicNavItems;
    }

    // Filter items based on user role
    const filteredItems = navItems.filter((item) =>
      item.roles.includes(user.role)
    );

    if (user.role === "admin") {
      // Admin allowed paths
      const allowedAdminPaths = [
        "/admin-dashboard",
        "/user-management",
        "/system-settings",
        "/audit-logs",
        "/academic-terms",
      ];
      return filteredItems.filter((item) =>
        allowedAdminPaths.includes(item.path)
      );
    }

    return filteredItems;
  };

  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path;
  };

  const visibleItems = getVisibleNavItems();

  return (
    <nav
      className={vertical ? "w-full" : "w-full overflow-x-auto scrollbar-hide"}
      role="navigation"
      aria-label="Main navigation"
    >
      <ul
        className={
          vertical
            ? "flex flex-col gap-2"
            : "flex list-none gap-1 sm:gap-2 justify-center items-center min-w-max px-1"
        }
      >
        {visibleItems.map((item) => (
          <li key={`${item.path}-${item.label}`} className="flex-shrink-0">
            <Link
              to={item.path}
              className={`block px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 whitespace-nowrap
                ${
                  isActiveRoute(item.path)
                    ? "text-primary-500 dark:text-cyan-400 bg-primary-50 dark:bg-cyan-900/20 font-semibold border border-primary-500 dark:border-cyan-400"
                    : "text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-cyan-400 hover:bg-primary-50 dark:hover:bg-gray-700"
                }
                ${vertical ? "w-full text-left" : ""}`}
              aria-current={isActiveRoute(item.path) ? "page" : undefined}
            >
              {item.label}
              {item.label === "Notifications" &&
                (user?.role === "student" || user?.role === "instructor") &&
                unread > 0 &&
                (user?.role === "instructor" || preferences.in_app_notifications !== false) && (
                  <span className="ml-2 inline-block min-w-[1.5em] px-1 py-0.5 text-xs leading-none rounded-full bg-blue-500 dark:bg-cyan-500 text-white align-middle">
                    {unread}
                  </span>
                )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};