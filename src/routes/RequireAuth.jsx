import { useAuth } from '../context/AuthContext.jsx'
import { Navigate, useLocation } from 'react-router-dom'

export default function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
