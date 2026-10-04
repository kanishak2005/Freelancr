import { useEffect, useState } from "react";

import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserStatus,
  verifyAdminUser,
  type AdminUser,
} from "../services/admin.api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [role, setRole] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminUsers({
        page,
        limit: 10,
        role: role || undefined,
        isActive:
          activeFilter === ""
            ? undefined
            : activeFilter === "true",
      });

      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, role, activeFilter]);

  const handleStatus = async (
    user: AdminUser
  ) => {
    try {
      await updateAdminUserStatus(
        user._id,
        !user.isActive
      );

      await loadUsers();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          "Failed to update user status."
      );
    }
  };

  const handleVerify = async (
    user: AdminUser
  ) => {
    try {
      await verifyAdminUser(
        user._id,
        !user.isVerified
      );

      await loadUsers();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          "Failed to update verification."
      );
    }
  };

  const handleDelete = async (
    user: AdminUser
  ) => {
    const confirmed = window.confirm(
      `Delete user "${user.fullName}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminUser(user._id);

      await loadUsers();
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          "Failed to delete user."
      );
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          User Management
        </h1>

        <p className="mt-2 text-gray-600">
          Manage Freelancr users and account status.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 rounded-xl border bg-white p-4 shadow-sm">
        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-4 py-2"
        >
          <option value="">All Roles</option>
          <option value="client">Clients</option>
          <option value="freelancer">
            Freelancers
          </option>
          <option value="admin">Admins</option>
        </select>

        <select
          value={activeFilter}
          onChange={(event) => {
            setActiveFilter(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-600">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No users found.
          </div>
        ) : (
          <table className="w-full min-w-[900px]">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  User
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Email
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Role
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Verification
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.fullName}
                      </p>

                      <p className="text-sm text-gray-500">
                        @{user.username}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-700">
                    {user.email}
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium capitalize text-indigo-700">
                      {user.role}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        user.isVerified
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.isVerified
                        ? "Verified"
                        : "Not Verified"}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleStatus(user)
                        }
                        disabled={user.role === "admin"}
                        className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {user.isActive
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleVerify(user)
                        }
                        disabled={user.role === "admin"}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {user.isVerified
                          ? "Unverify"
                          : "Verify"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(user)
                        }
                        disabled={user.role === "admin"}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() =>
            setPage((current) => current - 1)
          }
          className="rounded-lg border bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() =>
            setPage((current) => current + 1)
          }
          className="rounded-lg border bg-white px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </main>
  );
}
