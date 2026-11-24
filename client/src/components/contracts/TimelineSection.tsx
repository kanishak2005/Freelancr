import React from "react";
import type { ContractTimelineItem } from "../../services/contracts.api";

interface TimelineSectionProps {
  timeline: ContractTimelineItem[];
  loading: boolean;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  timeline,
  loading,
}) => {
  const formatActionTitle = (action: string) => {
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getActionColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("COMPLETED")) {
      return "bg-emerald-600 text-white";
    }
    if (action.includes("CHANGE_REQUESTED") || action.includes("CANCELLED")) {
      return "bg-amber-600 text-white";
    }
    if (action.includes("SUBMITTED")) {
      return "bg-indigo-600 text-white";
    }
    return "bg-slate-700 text-white";
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Contract Execution Timeline</h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Immutable chronological domain audit trace of lifecycle events and stakeholder actions.
        </p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs sm:text-sm text-slate-500">Loading timeline...</div>
      ) : timeline.length === 0 ? (
        <div className="py-8 text-center text-xs sm:text-sm text-slate-500">
          No audit history recorded for this contract yet.
        </div>
      ) : (
        <div className="relative mt-6 pl-2 sm:pl-4 before:absolute before:bottom-0 before:left-4 sm:before:left-6 before:top-2 before:w-0.5 before:bg-slate-200/70">
          <div className="space-y-6">
            {timeline.map((item) => (
              <div key={item._id} className="relative flex items-start gap-4">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-xs ${getActionColor(
                    item.action
                  )}`}
                >
                  ✓
                </div>

                <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {formatActionTitle(item.action)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(item.timestamp).toLocaleString("en-IN")}
                    </span>
                  </div>

                  {item.actor && (
                    <p className="mt-1 text-xs text-slate-600">
                      By: <span className="font-semibold text-slate-800">{item.actor.fullName}</span>{" "}
                      <span className="text-slate-400">({item.actor.role || "participant"})</span>
                    </p>
                  )}

                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <div className="mt-2.5 text-xs text-slate-500 bg-white/80 p-2.5 rounded-lg border border-slate-100/80">
                      {item.metadata.message && (
                        <p className="italic text-slate-600">"{String(item.metadata.message)}"</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3 font-medium text-slate-700">
                        {item.metadata.revision !== undefined && (
                          <span>Revision: #{item.metadata.revision}</span>
                        )}
                        {item.metadata.amount !== undefined && (
                          <span>Amount: ₹{item.metadata.amount.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
