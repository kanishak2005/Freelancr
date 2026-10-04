import { Link } from "react-router-dom";

import type { Contract } from "../../services/contracts.api";

import ContractStatusBadge from "./ContractStatusBadge";

interface ContractCardProps {
  contract: Contract;
}

function getUserName(
  user: Contract["client"]
) {
  if (typeof user === "string") {
    return user;
  }

  return user.fullName;
}

export default function ContractCard({
  contract,
}: ContractCardProps) {
  const clientName = getUserName(contract.client);
  const freelancerName = getUserName(
    contract.freelancer
  );

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {contract.title}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {contract.description}
          </p>
        </div>

        <ContractStatusBadge
          status={contract.status}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500">
            Amount
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            ?{contract.amount.toLocaleString("en-IN")}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            Delivery
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {contract.deliveryTime} days
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            Client
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {clientName}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            Freelancer
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {freelancerName}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Link
          to={`/contracts/${contract._id}`}
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          View Contract
        </Link>
      </div>
    </div>
  );
}
