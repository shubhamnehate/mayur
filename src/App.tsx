import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth, AppRole } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import AdminCourseEditor from "./pages/AdminCourseEditor";
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorCourses from "./pages/InstructorCourses";
import CourseEditor from "./pages/CourseEditor";
import LessonsManager from "./pages/LessonsManager";
import ClassworkManager from "./pages/ClassworkManager";
import Uploads from "./pages/Uploads";
import LearnCourse from "./pages/LearnCourse";
import NotFound from "./pages/NotFound";
import AITutor from "./components/AITutor";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: AppRole[] }> = ({ children, roles }) => {
  const { user, loading, roles: userRoles } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (roles && !roles.some((role) => userRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:courseId" element={<CourseDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin", "instructor", "teacher"]}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/course/:courseSlug"
              element={
                <ProtectedRoute roles={["admin", "instructor", "teacher"]}>
                  <AdminCourseEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor"
              element={
                <ProtectedRoute roles={["instructor", "teacher", "admin"]}>
                  <InstructorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/courses"
              element={
                <ProtectedRoute roles={["instructor", "teacher", "admin"]}>
                  <InstructorCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/course/:courseSlug"
              element={
                <ProtectedRoute roles={["instructor", "teacher", "admin"]}>
                  <CourseEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/lessons"
              element={
                <ProtectedRoute roles={["instructor", "teacher", "admin"]}>
                  <LessonsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/classwork"
              element={
                <ProtectedRoute roles={["instructor", "teacher", "admin"]}>
                  <ClassworkManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/instructor/uploads"
              element={
                <ProtectedRoute roles={["instructor", "teacher", "admin"]}>
                  <Uploads />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learn/:courseSlug"
              element={
                <ProtectedRoute roles={["student", "teacher", "instructor", "admin"]}>
                  <LearnCourse />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AITutor />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
