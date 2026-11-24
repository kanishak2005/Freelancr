import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getContract, type Contract } from "../services/contracts.api";
import { getContractReviews, type Review } from "../services/reviews.api";
import { useAppSelector } from "../store/hooks";
import ContractStatusBadge from "../components/contracts/ContractStatusBadge";
import ContractActions from "../components/contracts/ContractActions";
import { MilestoneSection } from "../components/contracts/MilestoneSection";
import { DeliverableSection } from "../components/contracts/DeliverableSection";
import { TimelineSection } from "../components/contracts/TimelineSection";
import ReviewCard from "../components/reviews/ReviewCard";
import ReviewForm from "../components/reviews/ReviewForm";
import { FinancialSection } from "../components/contracts/FinancialSection";
import {
  getMyPayments,
  getPayoutEligibility,
  type PayoutEligibility,
} from "../services/payments.api";
import {
  getContractMilestones,
  getContractDeliverables,
  getContractTimeline,
  type ContractMilestone,
  type ContractDeliverable,
  type ContractTimelineItem,
} from "../services/contracts.api";
import { LoadingSkeleton } from "../components/ui/LoadingSkeleton";
import { Badge } from "../components/ui/Badge";

export default function ContractDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAppSelector((state) => state.auth.user);

  const [contract, setContract] = useState<Contract | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [deliverables, setDeliverables] = useState<ContractDeliverable[]>([]);
  const [timeline, setTimeline] = useState<ContractTimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  const [eligibility, setEligibility] = useState<PayoutEligibility | null>(null);

  const loadFinancials = useCallback(async () => {
    if (!id) return;
    try {
      const [payments, elig] = await Promise.all([
        getMyPayments().catch(() => []),
        getPayoutEligibility(id).catch(() => null),
      ]);
      const currentPayment = (payments || []).find(
        (p: any) => p.contract?._id === id || p.contract === id
      );
      setPaymentRecord(currentPayment || null);
      setEligibility(elig);
    } catch {
      // Best-effort load
    }
  }, [id]);

  const loadMilestones = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getContractMilestones(id);
      setMilestones(data);
    } catch {
      // Best-effort load
    }
  }, [id]);

  const loadDeliverables = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getContractDeliverables(id);
      setDeliverables(data);
    } catch {
      // Best-effort load
    }
  }, [id]);

  const loadTimeline = useCallback(async () => {
    if (!id) return;
    try {
      setTimelineLoading(true);
      const data = await getContractTimeline(id);
      setTimeline(data);
    } catch {
      // Best-effort load
    } finally {
      setTimelineLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    try {
      setReviewsLoading(true);
      setReviewError("");
      const data = await getContractReviews(id);
      setReviews(data);
    } catch (err: any) {
      setReviewError(
        err?.response?.data?.message || "Failed to load reviews"
      );
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const loadContract = async () => {
      if (!id) {
        setError("Invalid contract ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await getContract(id);
        setContract(data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || "Failed to load contract"
        );
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [id]);

  useEffect(() => {
    loadReviews();
    loadMilestones();
    loadDeliverables();
    loadTimeline();
    loadFinancials();
  }, [loadReviews, loadMilestones, loadDeliverables, loadTimeline, loadFinancials]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        <LoadingSkeleton className="h-6 w-36" />
        <LoadingSkeleton className="h-64 w-full rounded-2xl" />
        <LoadingSkeleton className="h-44 w-full rounded-2xl" />
      </main>
    );
  }

  if (error || !contract) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-5 text-rose-700">
          <p className="font-semibold">{error || "Contract not found"}</p>
        </div>

        <Link
          to="/contracts"
          className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Contracts</span>
        </Link>
      </main>
    );
  }

  const clientId =
    typeof contract.client === "string"
      ? contract.client
      : contract.client._id;

  const freelancerId =
    typeof contract.freelancer === "string"
      ? contract.freelancer
      : contract.freelancer._id;

  const isClient = user?.id === clientId;
  const isFreelancer = user?.id === freelancerId;

  const hasSubmittedReview = reviews.some((review) => {
    const reviewerId =
      typeof review.reviewer === "string"
        ? review.reviewer
        : review.reviewer._id;
    return reviewerId === user?.id;
  });

  const otherUser = isClient ? contract.freelancer : contract.client;
  const otherUserId = typeof otherUser === "string" ? otherUser : otherUser?._id;
  const otherUserName = typeof otherUser === "string" ? otherUser : otherUser.fullName;

  const handleContractUpdated = (updatedContract: Contract) => {
    setContract(updatedContract);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* 1. Breadcrumb / Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/contracts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Contracts</span>
        </Link>
      </div>

      {/* 2. Primary Contract Overview Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {contract.executionMode === "milestone" ? "Milestone-Based Execution" : "Simple Delivery Execution"}
              </span>
              <ContractStatusBadge status={contract.status} size="md" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {contract.title}
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
              {contract.description}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5">
            {contract.fundingStatus === "pending_funding" ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                ● Awaiting Upfront Client Funding
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ✓ Funded in Platform Hold
              </span>
            )}

            {otherUserId && (isClient || isFreelancer) && (
              <Link
                to={`/chat/${otherUserId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{isFreelancer ? "Message Client" : "Message Freelancer"}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Upfront Funding Invariant Banner */}
        {contract.fundingStatus === "pending_funding" && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <span className="font-bold block mb-0.5">Important Escrow Hold Requirement:</span>
              <span>
                {isClient
                  ? "This contract requires upfront payment before work deliverables can be accepted or payouts released. Please fund the agreed amount below using Razorpay."
                  : "This contract is awaiting upfront funding from the client. Do not deliver work deliverables until the contract status reflects verified platform funding."}
              </span>
            </div>
          </div>
        )}

        {/* Contract Metric Tiles Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Amount</span>
            <span className="mt-0.5 block text-lg font-bold text-slate-900">
              ₹{contract.amount.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Agreed Value</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivery Time</span>
            <span className="mt-0.5 block text-lg font-bold text-slate-900">
              {contract.deliveryTime} {contract.deliveryTime === 1 ? "day" : "days"}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Estimated Duration</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Start Date</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {new Date(contract.startDate).toLocaleDateString("en-IN")}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Agreement Date</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completion</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {contract.endDate ? new Date(contract.endDate).toLocaleDateString("en-IN") : "In Progress"}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Status</span>
          </div>
        </div>

        {/* Counterparty Stakeholder Tiles */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Client</span>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {typeof contract.client === "string" ? contract.client : contract.client.fullName}
              </p>
              {typeof contract.client !== "string" && (
                <p className="text-xs text-slate-500">@{contract.client.username}</p>
              )}
            </div>
            {isClient && <Badge variant="primary" size="sm">You</Badge>}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Freelancer</span>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {typeof contract.freelancer === "string" ? contract.freelancer : contract.freelancer.fullName}
              </p>
              {typeof contract.freelancer !== "string" && (
                <p className="text-xs text-slate-500">@{contract.freelancer.username}</p>
              )}
            </div>
            {isFreelancer && <Badge variant="primary" size="sm">You</Badge>}
          </div>
        </div>

        {/* Bilateral Protocol & Actions */}
        {user && (
          <ContractActions
            contract={contract}
            currentUserId={user.id}
            onUpdated={handleContractUpdated}
          />
        )}
      </div>

      {/* 3. Financial History & Settlement Section (PRD 07 Task H) */}
      <FinancialSection
        contractId={contract._id}
        contractStatus={contract.status}
        isClient={isClient}
        isFreelancer={isFreelancer}
        isAdmin={user?.role === "admin"}
        amount={contract.amount}
        paymentRecord={paymentRecord}
        eligibility={eligibility}
        onRefresh={() => {
          loadFinancials();
          loadTimeline();
        }}
      />

      {/* 4. Milestone Execution Section (PRD 06 Task G) */}
      {contract.executionMode === "milestone" && (
        <MilestoneSection
          contractId={contract._id}
          isClient={isClient}
          milestones={milestones}
          onRefresh={() => {
            loadMilestones();
            loadTimeline();
          }}
        />
      )}

      {/* 5. Deliverables & Review Section (PRD 06 Task G) */}
      <DeliverableSection
        contractId={contract._id}
        isClient={isClient}
        isFreelancer={isFreelancer}
        contractStatus={contract.status}
        deliverables={deliverables}
        milestones={milestones}
        onRefresh={() => {
          loadDeliverables();
          loadMilestones();
          loadTimeline();
        }}
      />

      {/* 6. Domain Audit Timeline (PRD 06 Task G) */}
      <TimelineSection timeline={timeline} loading={timelineLoading} />

      {/* 7. Reviews Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Reviews & Feedback
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Mutual feedback submitted by the client and freelancer for this engagement.
          </p>
        </div>

        {reviewError && (
          <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs sm:text-sm text-rose-700">
            {reviewError}
          </div>
        )}

        {reviewsLoading ? (
          <LoadingSkeleton className="h-28 w-full rounded-xl" count={2} />
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs sm:text-sm text-slate-500">
            No reviews have been submitted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review._id} review={review} />
            ))}
          </div>
        )}
      </section>

      {/* 8. Review Submission Form */}
      {contract.status === "completed" &&
        user &&
        (isClient || isFreelancer) &&
        !hasSubmittedReview && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Review {otherUserName}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Share your experience working on this contract.
              </p>
            </div>

            <ReviewForm contractId={contract._id} onCreated={loadReviews} />
          </section>
        )}

      {contract.status === "completed" && hasSubmittedReview && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-semibold text-emerald-800">
          ✓ You have already submitted your review for this contract.
        </div>
      )}
    </main>
  );
}
