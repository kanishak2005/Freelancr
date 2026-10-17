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
      return "bg-green-500 text-white";
    }
    if (action.includes("CHANGE_REQUESTED") || action.includes("CANCELLED")) {
      return "bg-amber-500 text-white";
    }
    if (action.includes("SUBMITTED")) {
      return "bg-blue-500 text-white";
    }
    return "bg-indigo-500 text-white";
  };

  return (
    <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Contract Execution Timeline</h2>
      <p className="mt-1 text-sm text-gray-500">
        Immutable chronological domain audit trace of lifecycle events and stakeholder actions.
      </p>

      {loading ? (
        <div className="py-6 text-center text-sm text-gray-500">Loading timeline...</div>
      ) : timeline.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          No audit history recorded for this contract yet.
        </div>
      ) : (
        <div className="relative mt-6 pl-4 before:absolute before:bottom-0 before:left-6 before:top-2 before:w-0.5 before:bg-gray-200">
          <div className="space-y-6">
            {timeline.map((item) => (
              <div key={item._id} className="relative flex items-start gap-4">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${getActionColor(
                    item.action
                  )}`}
                >
                  ✓
                </div>

                <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">
                      {formatActionTitle(item.action)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {item.actor && (
                    <p className="mt-1 text-xs text-gray-600">
                      By: <span className="font-medium text-gray-800">{item.actor.fullName}</span>{" "}
                      ({item.actor.role || "participant"})
                    </p>
                  )}

                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {item.metadata.message && (
                        <p className="italic">"{String(item.metadata.message)}"</p>
                      )}
                      {item.metadata.revision !== undefined && (
                        <span className="mr-3 font-medium">Revision: #{item.metadata.revision}</span>
                      )}
                      {item.metadata.amount !== undefined && (
                        <span className="font-medium">Amount: ₹{item.metadata.amount}</span>
                      )}
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
