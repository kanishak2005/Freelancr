import {
  Link,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  clearCredentials,
} from "../store/slices/authSlice";

import {
  useAppDispatch,
  useAppSelector,
} from "../store/hooks";

import { logoutUser } from "../services/auth.api";

export default function MainLayout() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const user = useAppSelector(
    (state) => state.auth.user
  );

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error(
        "Logout API error:",
        error
      );
    } finally {
      localStorage.removeItem(
        "accessToken"
      );

      dispatch(clearCredentials());

      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-2xl font-bold text-indigo-600"
          >
            Freelancr
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="text-gray-700 hover:text-indigo-600"
            >
              Home
            </Link>

            <Link
              to="/jobs"
              className="text-gray-700 hover:text-indigo-600"
            >
              Find Jobs
            </Link>

            <Link
              to="/my-jobs"
              className="text-gray-700 hover:text-indigo-600"
            >
              My Jobs
            </Link>

            <Link
              to="/my-proposals"
              className="text-gray-700 hover:text-indigo-600"
            >
              My Proposals
            </Link>

            <Link
              to="/contracts"
              className="text-gray-700 hover:text-indigo-600"
            >
              Contracts
            </Link>
            {user?.role === "admin" && (
  <>
    <Link
      to="/admin"
      className="text-gray-700 hover:text-indigo-600"
    >
      Admin
    </Link>

    <Link
      to="/admin/users"
      className="text-gray-700 hover:text-indigo-600"
    >
      Users
    </Link>

    <Link
      to="/admin/jobs"
      className="text-gray-700 hover:text-indigo-600"
    >
      Admin Jobs
    </Link>
  </>
)}
            {user && (
              <>
                <Link
                  to={`/users/${user.id}/reviews`}
                  className="text-gray-700 hover:text-indigo-600"
                >
                  My Reviews
                </Link>
                <Link
  to="/admin/analytics"
  className="text-gray-700 hover:text-indigo-600"
>
  Analytics
</Link>

                <span className="text-sm text-gray-600">
                  Hi, {user.fullName}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
