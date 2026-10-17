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
    <Card hoverable>
      <CardBody className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-slate-900">
                {contract.title}
              </h2>
              {contract.executionMode === "milestone" && (
                <Badge variant="primary" size="sm">
                  Milestone Mode
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-500 line-clamp-1">
              {contract.description}
            </p>
          </div>

          <ContractStatusBadge status={contract.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Value</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              ₹{contract.amount.toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium">Timeline</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {contract.deliveryTime} {contract.deliveryTime === 1 ? "day" : "days"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium">Client</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 truncate">
              {clientName}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium">Freelancer</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800 truncate">
              {freelancerName}
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Started {new Date(contract.createdAt).toLocaleDateString("en-IN")}
          </span>

          <Link to={`/contracts/${contract._id}`}>
            <Button variant="primary" size="sm">
              View Contract & Deliverables →
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
