import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import NotificationProvider from "./components/NotificationProvider";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Statistics from "./pages/Statistics";
import NotFound from "./pages/NotFound";

// Redirect authenticated admins away from customer pages
function CustomerOnly({ children }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/admin" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <div className="app-modern d-flex flex-column min-vh-100">
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              {/* Customer routes — no login required */}
              <Route
                path="/"
                element={
                  <CustomerOnly>
                    <Home />
                  </CustomerOnly>
                }
              />

              {/* Login page — redirects to admin if already logged in */}
              <Route
                path="/login"
                element={
                  <CustomerOnly>
                    <Login />
                  </CustomerOnly>
                }
              />

              {/* Admin routes — login required */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stats"
                element={
                  <ProtectedRoute>
                    <Statistics />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;