import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProviderWithNavigation } from "./context/AuthProviderWithNavigation";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { AllocationDashboard } from "./components/allocation/AllocationDashboard";
import { StudentDashboard } from "./pages/student/StudentDashboard";
import { InstructorDashboard } from "./pages/instructor/InstructorDashboard";
import { SubmitTARequestPage } from "./pages/instructor/SubmitTARequestPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import { LandingPage } from "./pages/HomePage";
import Profile from "./pages/student/Profile";
import AcademicTermsPage from "./pages/ta-coordinator/AcademicTermsPage";
import CourseOfferingsPage from "./pages/ta-coordinator/CourseOfferingsPage";
import InstructorAssignmentPage from "./pages/ta-coordinator/InstructorAssignmentPage";
import TARequestsPage from "./pages/ta-coordinator/TARequestsPage";
import StudentApplicationsPage from "./pages/ta-coordinator/StudentApplicationsPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import UserManagementPage from "./pages/admin/UserManagementPage";
import SystemSettingsPage from "./pages/admin/SystemSettingsPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import { Sidebar } from "./components/layout/Sidebar";
import TAApplicationForm from "./components/taApplication/TAApplicationForm";
import { ApplicationHistory } from "./pages/student";
import AssignmentsPage from "./pages/student/AssignmentsPage";
import AssignedTAsPage from "./pages/instructor/AssignedTAsPage";
import CourseManagePage from "./pages/instructor/CourseManagePage";
import InstructorNotificationsPage from "./pages/instructor/InstructorNotificationsPage";
import { useAuth } from "./context/AuthContext";
import { ExportPage } from "./pages/ta-coordinator/ExportPage"; 
import BulkUploadPage from './pages/admin/BulkUploadPage';

// Placeholder components for routes
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-800 mb-4">{title}</h1>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

// Dashboard wrapper component that redirects based on user role
const DashboardWrapper: React.FC = () => {
  const { user } = useAuth();

  console.log("DashboardWrapper rendering, user:", user);

  if (!user) {
    console.log("DashboardWrapper: No user, showing loading");
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  console.log("DashboardWrapper: User role is", user.role);

  switch (user.role) {
    case "student":
      console.log("DashboardWrapper: Rendering StudentDashboard");
      return <StudentDashboard />;
    case "instructor":
      console.log("DashboardWrapper: Rendering InstructorDashboard");
      return <InstructorDashboard />;
    case "ta_coordinator":
      console.log("DashboardWrapper: Redirecting to academic-terms");
      return <Navigate to="/academic-terms" replace />;
    case "admin":
      console.log("DashboardWrapper: Redirecting to admin-dashboard");
      return <Navigate to="/admin-dashboard" replace />;
    default:
      console.log("DashboardWrapper: Unknown role, redirecting to login");
      return <Navigate to="/login" replace />;
  }
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {isAuthenticated && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}
      <div 
        className="flex-1 flex flex-col bg-white dark:bg-gray-900 transition-all duration-300"
        style={{ 
          marginLeft: isAuthenticated && sidebarOpen ? "16rem" : "0" 
        }}
      >
        <main className="flex-1 py-4">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Universal dashboard route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "student",
                    "instructor",
                    "ta_coordinator",
                    "admin",
                  ]}
                >
                  <DashboardWrapper />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apply"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <TAApplicationForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <PlaceholderPage title="My Applications" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/applications"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <ApplicationHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assignments"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <AssignmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Instructor routes */}
            <Route
              path="/submit-request"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <SubmitTARequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/notifications"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <InstructorNotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/course/:courseId/manage"
              element={
                <ProtectedRoute allowedRoles={["instructor"]}>
                  <CourseManagePage />
                </ProtectedRoute>
              }
            />

            {/* Shared routes */}
            <Route
              path="/allocations"
              element={
                <ProtectedRoute allowedRoles={["ta_coordinator"]}>
                  <AllocationDashboard />
                </ProtectedRoute>
              }
            />

            {/* Role management routes (Instructor & Admin) */}
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                  <AssignedTAsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructors"
              element={
                <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                  <PlaceholderPage title="Instructor Management" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admins"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <PlaceholderPage title="Admin Management" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bulk-upload"
              element={
                <ProtectedRoute allowedRoles={['ta_coordinator']}>
                  <BulkUploadPage />
                </ProtectedRoute>
              }
            />

            {/* Footer routes */}
            <Route
              path="/privacy"
              element={<PlaceholderPage title="Privacy Policy" />}
            />
            <Route
              path="/terms"
              element={<PlaceholderPage title="Terms of Service" />}
            />
            <Route
              path="/contact"
              element={<PlaceholderPage title="Contact" />}
            />

            {/* TA Coordinator routes - Remove admin access to certain routes */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["ta_coordinator"]}>
                  <ExportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic-terms"
              element={
                <ProtectedRoute allowedRoles={["ta_coordinator", "admin"]}>
                  <AcademicTermsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/course-offerings"
              element={
                <ProtectedRoute allowedRoles={["ta_coordinator"]}>
                  <CourseOfferingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor-assignment"
              element={
                <ProtectedRoute allowedRoles={["ta_coordinator"]}>
                  <InstructorAssignmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ta-requests"
              element={
                <ProtectedRoute allowedRoles={["ta_coordinator"]}>
                  <TARequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-applications"
              element={
                <ProtectedRoute allowedRoles={["ta_coordinator"]}>
                  <StudentApplicationsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-management"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProviderWithNavigation>
          <AppContent />
        </AuthProviderWithNavigation>
      </ThemeProvider>
    </Router>
  );
}

export default App;
