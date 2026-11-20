import { useEffect, useState } from "react";
import { getAdminAuditLogs } from "../services/admin.api";

interface AuditLogEntry {
  _id: string;
  action: string;
  actorId?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  ip?: string;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAdminAuditLogs({
        page,
        limit: 25,
        action: actionFilter || undefined,
      });
      setLogs(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit & Compliance Log</h1>
          <p className="text-sm text-slate-500">
            Immutable chronicle of administrative interventions, status overrides, and financial operations.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <input
            type="text"
            placeholder="Filter by action..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Log Container: Responsive Cards below 1024px (lg:hidden), Desktop Table at 1024px+ (hidden lg:block) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading immutable audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No audit log entries recorded.</div>
        ) : (
          <>
            {/* Desktop Table View (lg:block) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action Code</th>
                    <th className="px-6 py-3.5">Actor</th>
                    <th className="px-6 py-3.5">Target Entity</th>
                    <th className="px-6 py-3.5">Audit Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-semibold text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-slate-800 uppercase">{log.actorRole || "System"}</div>
                        <div className="text-slate-400 font-mono text-[10px]">{log.actorId ? `${log.actorId.substring(0, 8)}...` : "—"}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-medium text-slate-700">{log.targetType || "—"}</div>
                        <div className="text-slate-400 font-mono text-[10px]">{log.targetId ? `${log.targetId.substring(0, 8)}...` : "—"}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {log.metadata ? (
                          <pre className="max-w-xs overflow-x-auto rounded bg-slate-50 p-1.5 font-mono text-[10px] text-slate-600">
                            {JSON.stringify(log.metadata, null, 1)}
                          </pre>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View (< 1024px: lg:hidden) */}
            <div className="block lg:hidden divide-y divide-slate-200 p-4 space-y-4">
              {logs.map((log) => (
                <div
                  key={`mobile-log-${log._id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs space-y-3"
                >
                  {/* Header: Action & Timestamp */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-900 border border-slate-200">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Actor & Target Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Actor</span>
                      <span className="font-semibold text-slate-800 uppercase block">
                        {log.actorRole || "System"}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] truncate block">
                        {log.actorId ? `ID: ${log.actorId.substring(0, 10)}...` : "—"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Target</span>
                      <span className="font-semibold text-slate-800 block">
                        {log.targetType || "—"}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] truncate block">
                        {log.targetId ? `ID: ${log.targetId.substring(0, 10)}...` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Metadata Disclosure */}
                  {log.metadata && (
                    <details className="group pt-1">
                      <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 select-none focus:outline-none">
                        <span>Audit Metadata Details</span>
                        <span className="text-[10px] transition-transform group-open:rotate-180">▼</span>
                      </summary>
                      <div className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[10px] text-slate-200">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </>
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
