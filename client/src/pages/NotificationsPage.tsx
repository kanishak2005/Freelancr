import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "../services/notifications.api";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["notifications", "list", { page, isRead: filter === "unread" ? false : undefined }],
    queryFn: () =>
      getMyNotifications({
        page,
        limit: 20,
        isRead: filter === "unread" ? false : undefined,
      }),
    staleTime: 15 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }

    if (notification.link) {
      navigate(notification.link);
    } else if (notification.type === "contract") {
      navigate("/contracts");
    } else if (notification.type === "proposal") {
      navigate("/my-proposals");
    } else if (notification.type === "payment") {
      navigate("/payments");
    }
  };

  const notifications = data?.notifications || [];
  const totalPages = data?.totalPages || 1;

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Notifications Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Stay updated on proposals, contracts, milestone approvals, and payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={markAllReadMutation.isPending || notifications.length === 0}
            onClick={() => markAllReadMutation.mutate()}
          >
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 ${
            filter === "all"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All Notifications
        </button>
        <button
          type="button"
          onClick={() => {
            setFilter("unread");
            setPage(1);
          }}
          className={`pb-3 px-3 text-sm font-semibold transition-colors border-b-2 ${
            filter === "unread"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Unread Only
        </button>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center justify-between">
          <span>{(error as any)?.response?.data?.message || "Failed to load notifications."}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-24 w-full" count={4} />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "No unread notifications" : "No notifications found"}
          description="You're completely up to date. Relevant alerts for contracts and bids will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n._id}
              hoverable
              onClick={() => handleNotificationClick(n)}
              className={`cursor-pointer transition-all ${
                !n.isRead ? "bg-indigo-50/30 border-indigo-200" : ""
              }`}
            >
              <CardBody className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                        !n.isRead ? "bg-indigo-600" : "bg-transparent"
                      }`}
                    />

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2
                          className={`text-sm ${
                            !n.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"
                          }`}
                        >
                          {n.title}
                        </h2>
                        <Badge variant="neutral" size="sm">
                          {n.type}
                        </Badge>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {n.message}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(n.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {n.link && (
                      <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        Open →
                      </span>
                    )}

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(n._id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                        title="Mark as read"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>

              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
