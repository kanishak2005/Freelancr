import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

export default function AdminRoute() {
  const { user, initialized } = useAppSelector(
    (state) => state.auth
  );

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
