import { Link } from "react-router-dom";
import type { Contract } from "../../services/contracts.api";
import ContractStatusBadge from "./ContractStatusBadge";
import { Card, CardBody } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface ContractCardProps {
  contract: Contract;
}

function getUserName(user: Contract["client"]) {
  if (typeof user === "string") {
    return user;
  }
  return user?.fullName || "User";
}

export default function ContractCard({ contract }: ContractCardProps) {
  const clientName = getUserName(contract.client);
  const freelancerName = getUserName(contract.freelancer);

  return (
    <Card hoverable className="border-slate-200/80 shadow-xs">
      <CardBody className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                {contract.title}
              </h2>
              {contract.executionMode === "milestone" ? (
                <Badge variant="primary" size="sm">
                  Milestone Mode
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  Simple Delivery
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
              {contract.description}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {contract.fundingStatus === "pending_funding" ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                ● Awaiting Funding
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ✓ Funded
              </span>
            )}
            <ContractStatusBadge status={contract.status} />
          </div>
        </div>

        {/* Contract Metric Tiles */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Value</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              ₹{contract.amount.toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Timeline</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {contract.deliveryTime} {contract.deliveryTime === 1 ? "day" : "days"}
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Client</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 truncate">
              {clientName}
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Freelancer</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 truncate">
              {freelancerName}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-xs text-slate-400">
            Started {new Date(contract.createdAt).toLocaleDateString("en-IN")}
          </span>

          <Link to={`/contracts/${contract._id}`}>
            <Button variant="primary" size="sm" className="w-full sm:w-auto">
              View Contract & Deliverables →
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
