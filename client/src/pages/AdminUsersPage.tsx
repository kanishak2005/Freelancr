import { useEffect, useState } from "react";
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserStatus,
  verifyAdminUser,
  type AdminUser,
} from "../services/admin.api";
import { Badge } from "../components/ui/Badge";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAdminUsers({
        page,
        limit: 10,
        role: role || undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
      });
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, role, activeFilter]);

  const handleStatus = async (user: AdminUser) => {
    try {
      setActionLoadingId(user._id);
      await updateAdminUserStatus(user._id, !user.isActive);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update user status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerify = async (user: AdminUser) => {
    try {
      setActionLoadingId(user._id);
      await verifyAdminUser(user._id, !user.isVerified);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update verification.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = window.confirm(
      `Delete user "${user.fullName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(user._id);
      await deleteAdminUser(user._id);
      await loadUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete user.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketplace User Accounts</h1>
          <p className="text-sm text-slate-500">
            Search, verify identity flags, inspect account statuses, and moderate platform members.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Account Roles</option>
            <option value="client">Clients</option>
            <option value="freelancer">Freelancers</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Accounts</option>
            <option value="false">Deactivated Accounts</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading user registry...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No users match the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-6 py-3.5">User Identity</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Verification</th>
                  <th className="px-6 py-3.5 text-right">Moderation Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => {
                  const isProcessing = actionLoadingId === u._id;
                  const isAdmin = u.role === "admin";
                  return (
                    <tr key={u._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{u.fullName}</div>
                        <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-mono">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                            u.role === "admin"
                              ? "bg-rose-100 text-rose-800"
                              : u.role === "client"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={u.isActive ? "success" : "danger"} size="sm">
                          {u.isActive ? "Active" : "Deactivated"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={u.isVerified ? "primary" : "neutral"} size="sm">
                          {u.isVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isAdmin || isProcessing}
                            onClick={() => handleStatus(u)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            disabled={isAdmin || isProcessing}
                            onClick={() => handleVerify(u)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          >
                            {u.isVerified ? "Revoke" : "Verify"}
                          </button>
                          <button
                            type="button"
                            disabled={isAdmin || isProcessing}
                            onClick={() => handleDelete(u)}
                            className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs">
            <span className="text-slate-600">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
