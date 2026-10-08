import { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Layout from "./components/Layout";
import { lazyWithPreload } from "./utils/lazyWithPreload";
import "./App.css";

// Lazy load the pages for code splitting
const Login = lazyWithPreload(() => import("./pages/Login"));
const Register = lazyWithPreload(() => import("./pages/Register"));
const Dashboard = lazyWithPreload(() => import("./pages/Dashboard"));
const Preprocessing = lazyWithPreload(() => import("./pages/Preprocessing"));
const Eda = lazyWithPreload(() => import("./pages/EDA"));
const Visualizations = lazyWithPreload(() => import("./pages/Visualizations"));
const ModelTraining = lazyWithPreload(() => import("./pages/ModelTraining"));
const ModelComparison = lazyWithPreload(() => import("./pages/ModelComparison"));
const Profile = lazyWithPreload(() => import("./pages/Profile"));
const Predictions = lazyWithPreload(() => import("./pages/Predictions"));
const ModelManagement = lazyWithPreload(() => import("./pages/ModelManagement"));

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "100000000000-placeholder.apps.googleusercontent.com";

// Skeleton loading fallback
const SkeletonLoader = () => (
  <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ height: 36, width: 200, background: "var(--border)", borderRadius: "var(--rs)" }} />
    <div style={{ height: 120, background: "var(--border)", borderRadius: "var(--r)", opacity: 0.5 }} />
    <div style={{ height: 200, background: "var(--border)", borderRadius: "var(--r)", opacity: 0.3 }} />
  </div>
);

// Global loader for initial page load
const GlobalLoader = () => (
  <div style={{ display: "flex", height: "100vh", width: "100%", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
    <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
  </div>
);

// Protected route
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Suspense fallback={<SkeletonLoader />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
};

function App() {
  useEffect(() => {
    Dashboard.preload();
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Suspense fallback={<GlobalLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/preprocessing" element={<Preprocessing />} />
              <Route path="/eda" element={<Eda />} />
              <Route path="/visualizations" element={<Visualizations />} />
              <Route path="/ml-model" element={<ModelTraining />} />
              <Route path="/ml-comparison" element={<ModelComparison />} />
              <Route path="/models" element={<ModelManagement />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
