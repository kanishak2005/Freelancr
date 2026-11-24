import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserStatus,
  verifyAdminUser,
  type AdminUser,
} from "../services/admin.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

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
      setError(err?.response?.data?.message || "Failed to load user directory.");
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
      toast.success(`User account ${user.isActive ? "suspended" : "activated"} successfully.`);
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update user status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerify = async (user: AdminUser) => {
    try {
      setActionLoadingId(user._id);
      await verifyAdminUser(user._id, !user.isVerified);
      toast.success(`User verification ${user.isVerified ? "revoked" : "approved"}.`);
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update verification.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const userId = userToDelete._id;

    try {
      setActionLoadingId(userId);
      await deleteAdminUser(userId);
      toast.success("User account deleted successfully.");
      setUserToDelete(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete user.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case "admin":
        return "danger";
      case "client":
        return "primary";
      case "freelancer":
        return "success";
      default:
        return "neutral";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Marketplace User Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search, verify identity flags, inspect account statuses, and moderate platform members.
          </p>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={role}
            aria-label="Filter by account role"
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="">All Account Roles</option>
            <option value="client">Clients</option>
            <option value="freelancer">Freelancers</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={activeFilter}
            aria-label="Filter by account status"
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs outline-none hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Accounts</option>
            <option value="false">Deactivated Accounts</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="danger" size="sm" onClick={loadUsers}>
            Retry
          </Button>
        </div>
      )}

      {/* Users Container: Responsive Cards below 1024px (lg:hidden), Desktop Table at 1024px+ (hidden lg:block) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <LoadingSkeleton className="h-10 w-full rounded-xl" count={5} />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No marketplace users match the selected filter criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table View (lg:block) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">User Identity</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Verification</th>
                    <th className="px-6 py-3.5 text-right">Moderation Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isProcessing = actionLoadingId === u._id;
                    const isAdmin = u.role === "admin";
                    return (
                      <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-xs text-slate-500 font-mono">@{u.username}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 font-mono">
                          {u.email}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                            {u.role.toUpperCase()}
                          </Badge>
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
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isAdmin || isProcessing}
                              onClick={() => handleStatus(u)}
                              title={isAdmin ? "Protected Admin Account" : undefined}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isAdmin || isProcessing}
                              onClick={() => handleVerify(u)}
                              title={isAdmin ? "Protected Admin Account" : undefined}
                            >
                              {u.isVerified ? "Revoke" : "Verify"}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={isAdmin || isProcessing}
                              onClick={() => setUserToDelete(u)}
                              title={isAdmin ? "Protected Admin Account" : undefined}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View (< 1024px: lg:hidden) */}
            <div className="block lg:hidden divide-y divide-slate-100 p-4 space-y-4">
              {users.map((u) => {
                const isProcessing = actionLoadingId === u._id;
                const isAdmin = u.role === "admin";
                return (
                  <div
                    key={`mobile-user-${u._id}`}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                  >
                    {/* User Header & Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 truncate">{u.fullName}</h2>
                        <p className="text-xs text-slate-500 font-mono truncate">@{u.username}</p>
                      </div>
                      <Badge variant={getRoleBadgeVariant(u.role)} size="sm">
                        {u.role.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Email */}
                    <div className="text-xs text-slate-600 font-mono break-all bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      {u.email}
                    </div>

                    {/* Status & Verification Badges */}
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant={u.isActive ? "success" : "danger"} size="sm">
                        {u.isActive ? "Active" : "Deactivated"}
                      </Badge>
                      <Badge variant={u.isVerified ? "primary" : "neutral"} size="sm">
                        {u.isVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>

                    {/* Moderation Controls */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isAdmin || isProcessing}
                        onClick={() => handleStatus(u)}
                        title={isAdmin ? "Protected Admin Account" : undefined}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isAdmin || isProcessing}
                        onClick={() => handleVerify(u)}
                        title={isAdmin ? "Protected Admin Account" : undefined}
                      >
                        {u.isVerified ? "Revoke" : "Verify"}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isAdmin || isProcessing}
                        onClick={() => setUserToDelete(u)}
                        title={isAdmin ? "Protected Admin Account" : undefined}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/75 px-6 py-3.5 text-xs">
            <span className="text-slate-600 font-medium">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(userToDelete)}
        title="Delete User Account"
        message={
          userToDelete
            ? `Delete user "${userToDelete.fullName}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={Boolean(actionLoadingId)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
