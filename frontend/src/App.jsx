import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { queryClient } from './config/queryClient';

const Login = lazy(() => import('./components/auth/Login'));
const Signup = lazy(() => import('./components/auth/Signup'));
const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));
const Restaurant = lazy(() => import('./pages/Restaurant'));
const Cart = lazy(() => import('./pages/Cart'));
const Orders = lazy(() => import('./pages/Orders'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DashboardPreview = lazy(() => import('./pages/DashboardPreview'));
const FoodReels = lazy(() => import('./pages/FoodReels'));
const GroupOrder = lazy(() => import('./pages/GroupOrder'));
const DriverLogin = lazy(() => import('./pages/driver/DriverLogin'));
const DriverDashboard = lazy(() => import('./pages/driver/DriverDashboard'));
const AvailableOrders = lazy(() => import('./pages/driver/AvailableOrders'));
const AssignedOrders = lazy(() => import('./pages/driver/AssignedOrders'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminRestaurants = lazy(() => import('./pages/admin/AdminRestaurants'));
const AdminMenu = lazy(() => import('./pages/admin/AdminMenu'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));

const DASHBOARD_ALLOWED_EMAILS = ['yashchau.work@gmail.com'];

function App() {
  const pageFallback = (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] text-sm text-[#A1A1AA]">
      Loading page...
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'yumzo-toast',
              style: {
                borderRadius: '14px',
                fontSize: '14px',
                padding: '12px 14px',
              },
              success: {
                style: { borderLeft: '4px solid #16a34a' },
              },
              error: {
                style: { borderLeft: '4px solid #ef4444' },
              },
            }}
          />
        <Suspense fallback={pageFallback}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/driver/login" element={<DriverLogin />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard-preview" element={<DashboardPreview />} />

          {/* Customer-only routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Restaurant />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reels"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <FoodReels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/group-order"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <GroupOrder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']} allowedEmails={DASHBOARD_ALLOWED_EMAILS}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/manage-restaurants"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin']} allowedEmails={DASHBOARD_ALLOWED_EMAILS}>
                <AdminRestaurants />
              </ProtectedRoute>
            }
          />

          {/* Driver-only routes */}
          <Route
            path="/driver/dashboard"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/orders/available"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <AvailableOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/orders/assigned"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <AssignedOrders />
              </ProtectedRoute>
            }
          />

          {/* Admin-only routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']} allowedEmails={DASHBOARD_ALLOWED_EMAILS}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/restaurants"
            element={
              <ProtectedRoute allowedRoles={['admin']} allowedEmails={DASHBOARD_ALLOWED_EMAILS}>
                <AdminRestaurants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/menu"
            element={
              <ProtectedRoute allowedRoles={['admin']} allowedEmails={DASHBOARD_ALLOWED_EMAILS}>
                <AdminMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={['admin']} allowedEmails={DASHBOARD_ALLOWED_EMAILS}>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
