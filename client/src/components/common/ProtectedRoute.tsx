import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

export default function ProtectedRoute() {
  const {
    isAuthenticated,
    initialized,
  } = useAppSelector(
    (state) => state.auth
  );

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}