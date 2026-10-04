import { useEffect, useState } from "react";

import {
  getMyContracts,
  type Contract,
} from "../services/contracts.api";

import ContractCard from "../components/contracts/ContractCard";

export default function ContractsPage() {
  const [contracts, setContracts] =
    useState<Contract[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadContracts = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getMyContracts();

        setContracts(data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load contracts"
        );
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-gray-600">
          Loading contracts...
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          My Contracts
        </h1>

        <p className="mt-2 text-gray-600">
          Track your active, completed and cancelled contracts.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && contracts.length === 0 && (
        <div className="rounded-xl border bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            No contracts yet
          </h2>

          <p className="mt-2 text-gray-500">
            Your accepted proposals will appear here.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {contracts.map((contract) => (
          <ContractCard
            key={contract._id}
            contract={contract}
          />
        ))}
      </div>
    </main>
  );
}
