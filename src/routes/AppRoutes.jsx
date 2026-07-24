import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext.jsx'
import { ThemeProvider } from '../context/ThemeContext.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import AuthenticatedLayout from '../layouts/AuthenticatedLayout.jsx'
import RequireAuth from './RequireAuth.jsx'
import Home from '../pages/Home.jsx'
import Login from '../pages/Login.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import NotFound from '../pages/NotFound.jsx'

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AuthLayout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
            </Route>

            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AuthenticatedLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
