import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAllJobs, type Job } from "../services/jobs.api";
import { useAppSelector } from "../store/hooks";
import PublicNavbar from "../components/navigation/PublicNavbar";
import PublicFooter from "../components/navigation/PublicFooter";
import JobCard from "../components/jobs/JobCard";

// Verified popular categories matching platform skills and filters
const POPULAR_CATEGORIES = [
  {
    name: "Web Development",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    description: "Full-stack apps, React, Node.js, Next.js, and API engineering",
    query: "Web Development",
  },
  {
    name: "Mobile App Development",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    description: "Cross-platform iOS and Android solutions with React Native & Flutter",
    query: "Mobile App Development",
  },
  {
    name: "UI/UX & Product Design",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: "Figma design systems, wireframes, user testing, and interactive prototypes",
    query: "Design & Creative",
  },
  {
    name: "AI & Data Science",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    description: "Machine learning models, Python analytics, automation, and LLM integrations",
    query: "AI & Data Science",
  },
  {
    name: "DevOps & Cloud",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    description: "Docker, Kubernetes, AWS, CI/CD pipelines, and infrastructure as code",
    query: "DevOps & Cloud",
  },
  {
    name: "Digital Marketing & Content",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    description: "Technical copywriting, search engine optimization, and growth campaigns",
    query: "Digital Marketing",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");

  // Query real public jobs for discovery section
  const {
    data: publicJobs = [],
    isLoading: jobsLoading,
    isError: jobsError,
  } = useQuery<Job[]>({
    queryKey: ["public-jobs-homepage"],
    queryFn: async () => {
      const jobs = await getAllJobs({ limit: 4, sort: "newest" });
      return jobs || [];
    },
    staleTime: 60 * 1000,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/jobs?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/jobs");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Header & Navigation */}
      <PublicNavbar />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-200/80">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-indigo-100/50 via-purple-50/30 to-pink-50/20 blur-3xl -z-10 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Value Prop, Search, CTAs */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  Verified Freelancer Marketplace
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
                  Great work starts with the{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-800">
                    right connection.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Discover opportunities, connect with skilled professionals, and manage freelance projects from proposal to milestone completion — all in one place.
                </p>

                {/* Hero Search Bar */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="mt-6 flex flex-col sm:flex-row items-center gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-indigo-950/5 max-w-xl mx-auto lg:mx-0 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all"
                >
                  <div className="flex items-center gap-3 w-full px-3 py-2 text-slate-400">
                    <svg className="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      id="hero-job-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search jobs by title, tech stack (e.g. React, Python)..."
                      className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    id="hero-search-submit-btn"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    Search Jobs
                  </button>
                </form>

                {/* Direct Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                  <Link
                    to="/jobs"
                    id="hero-find-work-btn"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all active:scale-98"
                  >
                    <span>Find Work</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>

                  <Link
                    to={user?.role === "client" ? "/jobs/create" : "/register"}
                    id="hero-hire-talent-btn"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all active:scale-98"
                  >
                    <span>{user?.role === "client" ? "Post a Job" : "Hire Talent"}</span>
                  </Link>
                </div>

                {/* Micro Trust Indicators */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Structured Milestones</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Deliverable Approvals</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Protected Settlement</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Visual Graphic */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-md p-6 shadow-2xl shadow-indigo-950/10">
                  {/* Mock Contract Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                        F
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Contract Workspace</h4>
                        <p className="text-xs text-slate-400">Fixed Budget & Milestones</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      Active
                    </span>
                  </div>

                  {/* Milestone Progress visualization */}
                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                        <span>Milestone 1: Architecture & API Schema</span>
                        <span className="text-emerald-600">Approved ✓</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-2 rounded-full w-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                        <span>Milestone 2: Frontend & Component System</span>
                        <span className="text-indigo-600">Submitted for Review</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2 rounded-full w-3/4 animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1.5">
                        <span>Milestone 3: Deployment & Sign-off</span>
                        <span>Pending</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-slate-200 h-2 rounded-full w-0" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Feature Metric Box */}
                  <div className="mt-6 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-semibold text-indigo-900 uppercase tracking-wider">
                        Protected Contract Balance
                      </span>
                      <span className="text-xl font-black text-indigo-700">₹45,000 INR</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-500 font-medium">Auto Dispute Guard</span>
                      <span className="text-xs font-bold text-slate-700">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Marketplace Discovery (Real API Jobs) */}
        <section id="featured-jobs" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                  <span>Explore Marketplace</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  Latest Open Projects
                </h2>
                <p className="mt-2 text-sm text-slate-500 max-w-xl">
                  Real client projects currently open for proposals. Review budgets, required skills, and timeline expectations.
                </p>
              </div>

              <Link
                to="/jobs"
                id="browse-all-jobs-link"
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span>Browse All Jobs</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Loading State */}
            {jobsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse space-y-4"
                  >
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-16 bg-slate-200 rounded w-full" />
                    <div className="h-8 bg-slate-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Error or Empty State */}
            {!jobsLoading && (jobsError || publicJobs.length === 0) && (
              <div className="p-12 text-center rounded-3xl border border-slate-200 bg-slate-50/60 max-w-2xl mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  💼
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No Open Jobs Right Now</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Check back soon or post a new job for skilled freelancers on the marketplace.
                </p>
                <Link
                  to={user?.role === "client" ? "/jobs/create" : "/register"}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm transition-all"
                >
                  Post a Job on Freelancr
                </Link>
              </div>
            )}

            {/* Jobs List Grid */}
            {!jobsLoading && publicJobs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publicJobs.slice(0, 4).map((job) => (
                  <JobCard key={job._id} job={job} showSaveButton={Boolean(user)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. Categories & Popular Skills */}
        <section id="categories" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Discover by Expertise
              </span>
              <h2 className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
                Top Marketplace Categories
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                Connect with vetted talent across key software, product, and creative disciplines.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {POPULAR_CATEGORIES.map((cat) => (
                <Link
                  key={cat.name}
                  to={`/jobs?category=${encodeURIComponent(cat.query)}`}
                  className="group p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {cat.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span>Explore projects</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 5. How Freelancr Works */}
        <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Platform Workflow
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                How Freelancr Works
              </h2>
              <p className="mt-3 text-base text-slate-600">
                A structured, milestone-oriented lifecycle built to prevent misunderstandings and protect deliverable quality.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center mb-4 text-sm shadow-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Discover or Post</h3>
                <p className="text-xs text-slate-600 leading-relaxed flex-1">
                  Clients post detailed projects with clear budget models. Freelancers browse opportunities and evaluate requirements.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center mb-4 text-sm shadow-sm">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Submit Proposals</h3>
                <p className="text-xs text-slate-600 leading-relaxed flex-1">
                  Freelancers propose specific bid amounts, estimated delivery times, and customized cover letters to stand out.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center mb-4 text-sm shadow-sm">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Create Contract</h3>
                <p className="text-xs text-slate-600 leading-relaxed flex-1">
                  The client accepts a proposal, forming a formal contract with agreed milestone terms, timelines, and deliverables.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center mb-4 text-sm shadow-sm">
                  4
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Submit & Review</h3>
                <p className="text-xs text-slate-600 leading-relaxed flex-1">
                  Work is submitted per milestone. The client reviews deliverables, requests modifications if needed, or grants approval.
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center mb-4 text-sm shadow-sm">
                  5
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Settlement & Trust</h3>
                <p className="text-xs text-slate-600 leading-relaxed flex-1">
                  Milestone funds are disbursed upon verified completion. Both parties submit reviews to build transparent platform reputation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Separate Value Propositions (Clients & Freelancers) */}
        <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Tailored Solutions
              </span>
              <h2 className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
                Built for Both Sides of the Market
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* For Clients */}
              <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4">
                    For Businesses & Clients
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    Hire with clarity, pay with confidence
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Eliminate scope ambiguity. Post your technical project and manage contractors through verified milestones with clear deliverables.
                  </p>

                  <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Post fixed or hourly requirements with specific skill parameters.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Compare competitive proposals with transparent bid amounts and timelines.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Inspect deliverables before approving milestone completion.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Manage payments securely through established platform records.</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to={user?.role === "client" ? "/jobs/create" : "/register"}
                  className="w-full text-center py-3.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                >
                  {user?.role === "client" ? "Create a Project Post" : "Sign Up to Hire Talent"}
                </Link>
              </div>

              {/* For Freelancers */}
              <div className="p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
                    For Independent Professionals
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    Find quality projects, get paid on time
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Focus on writing great code and building standout products. Freelancr safeguards your work with milestone contracts and organized progress logs.
                  </p>

                  <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Search open jobs tailored to your tech stack and experience level.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Submit detailed proposals with your customized bids and timelines.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Deliver milestones with upload proofs and versioned review statuses.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Track earned balances directly in your authenticated platform wallet.</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/jobs"
                  className="w-full text-center py-3.5 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
                >
                  Explore Available Jobs
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Trust & Platform Capabilities */}
        <section id="marketplace-trust" className="py-16 sm:py-24 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Reliability & Integrity
              </span>
              <h2 className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
                Designed for Platform Accountability
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Built-in guardrails ensure fair interactions, role-based protection, and complete auditability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Role-Based Security</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Strict authorization boundaries separate client, freelancer, and administrative actions, preventing unauthorized project modifications.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Milestone-Guarded Settlement</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Funds correspond to concrete deliverables. Release occurs upon client approval, supported by administrative dispute mechanisms.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Authenticated Feedback</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Reviews are strictly tied to completed contracts. No fabricated testimonials or unverified rating scores.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Final Call to Action */}
        <section className="py-16 sm:py-24 bg-gradient-to-tr from-indigo-900 via-indigo-800 to-slate-900 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Ready to start your next freelance project?
            </h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Join Freelancr today as a client looking for skilled expertise or as an independent specialist ready to build great work.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register"
                id="cta-join-freelancr-btn"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-sm bg-white text-indigo-900 hover:bg-slate-100 shadow-xl transition-all active:scale-98"
              >
                Get Started Now
              </Link>
              <Link
                to="/jobs"
                id="cta-browse-jobs-btn"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-sm border border-indigo-400/40 text-white hover:bg-indigo-800/40 transition-all active:scale-98"
              >
                Browse Open Jobs
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <PublicFooter />
    </div>
  );
}