import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion, type Variants } from "framer-motion";
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
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    description: "Full-stack apps, React, Node.js, Next.js, and API architecture",
    query: "Web Development",
    demand: "High Volume",
  },
  {
    name: "Mobile App Development",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    description: "Cross-platform iOS and Android solutions with React Native & Flutter",
    query: "Mobile App Development",
    demand: "Active Contracts",
  },
  {
    name: "UI/UX & Product Design",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    description: "Figma design systems, wireframes, user testing, and prototypes",
    query: "Design & Creative",
    demand: "Design Systems",
  },
  {
    name: "AI & Data Engineering",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    description: "Machine learning pipelines, Python analytics, and LLM integrations",
    query: "AI & Data Science",
    demand: "Fast Growing",
  },
  {
    name: "DevOps & Cloud Systems",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    description: "Docker, Kubernetes, AWS, CI/CD pipelines, and cloud security",
    query: "DevOps & Cloud",
    demand: "Infrastructure",
  },
  {
    name: "Digital Strategy & Growth",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    description: "Technical copywriting, SEO audits, analytics, and growth execution",
    query: "Digital Marketing",
    demand: "Strategy",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const prefersReducedMotion = useReducedMotion();

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

  // Motion variants with full prefersReducedMotion safety
  const fadeIn: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45 },
    },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* 1. Header & Navigation */}
      <PublicNavbar />

      <main className="flex-1">
        {/* 2. Hero Section: Editorial Asymmetric Layout with Architectural Visual */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32 border-b border-slate-800/80 bg-slate-950">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-radial-gradient from-indigo-600/12 via-indigo-900/5 to-transparent blur-3xl -z-10 pointer-events-none" />

          {/* Architectural Background Grid Texture */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 pointer-events-none"
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center">
              {/* Left Column: Value Prop & Editorial Content (7 Cols) */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="lg:col-span-7 space-y-7 text-center lg:text-left"
              >
                {/* Status Pill Badge */}
                <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-indigo-300 border border-slate-800 text-xs font-semibold tracking-wide shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span>The Milestone-Governed Freelance Marketplace</span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                  variants={fadeIn}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] text-balance"
                >
                  Engineering trust between{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-white">
                    skilled creators
                  </span>{" "}
                  and ambitious teams.
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  variants={fadeIn}
                  className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal"
                >
                  Freelancr transforms freelance agreements into transparent milestone contracts. Transparent proposals, protected funds, and auditable deliverables — built for serious work.
                </motion.p>

                {/* Hero Search Bar */}
                <motion.form
                  variants={fadeIn}
                  onSubmit={handleSearchSubmit}
                  className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl shadow-black/40 max-w-xl mx-auto lg:mx-0 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all backdrop-blur-md"
                >
                  <div className="flex items-center gap-3 w-full px-3.5 py-2.5 text-slate-400">
                    <svg className="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      id="hero-job-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search jobs by keyword, framework (React, Python)..."
                      className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    id="hero-search-submit-btn"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 shrink-0"
                  >
                    Search Jobs
                  </button>
                </motion.form>

                {/* Action CTAs */}
                <motion.div variants={fadeIn} className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                  <Link
                    to="/jobs"
                    id="hero-find-work-btn"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <span>Explore Open Jobs</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>

                  <Link
                    to={user?.role === "client" ? "/jobs/create" : user ? "/dashboard" : "/register"}
                    id="hero-hire-talent-btn"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <span>{user?.role === "client" ? "Post a Project" : user ? "View Workspace" : "Create Account"}</span>
                  </Link>
                </motion.div>

                {/* Invariant Trust Badges */}
                <motion.div
                  variants={fadeIn}
                  className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs font-medium text-slate-400"
                >
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Strict Milestone Escrows</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Auditable Deliverables</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Dispute Mediation Ready</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column: Architectural Contract Demonstration Canvas (5 Cols) */}
              <motion.div
                initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : 0.15 }}
                className="lg:col-span-5 relative"
              >
                <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl shadow-black/60 overflow-hidden">
                  {/* Decorative subtle header tag indicating illustrative demo nature */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-white tracking-tight">Contract Workspace</h2>
                          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">DEMO SPECIMEN</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">Real-Time Milestone Execution</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>

                  {/* Demonstration Milestone Progress visualization */}
                  <div className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-200">
                        <span>Milestone 1: Backend Architecture & Auth</span>
                        <span className="text-emerald-400">Approved ✓</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full w-full" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-200">
                        <span>Milestone 2: Component Design & State</span>
                        <span className="text-indigo-400">Under Client Review</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-500 h-1.5 rounded-full w-3/4" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium text-slate-500">
                        <span>Milestone 3: Production Hardening</span>
                        <span>Pending</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-slate-700 h-1.5 rounded-full w-0" />
                      </div>
                    </div>
                  </div>

                  {/* Financial Safeguard Metric Callout */}
                  <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                        Protected Contract Balance
                      </span>
                      <span className="text-xl font-black text-white tracking-tight font-mono">₹45,000 INR</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-400 font-medium">Automatic Escrow Guard</span>
                      <span className="text-xs font-bold text-emerald-400">VERIFIED</span>
                    </div>
                  </div>

                  {/* Verification Note */}
                  <p className="mt-3 text-[10px] text-slate-500 text-center">
                    Sample workflow diagram illustrating contract protection logic.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 3. Marketplace Discovery (Genuine TanStack Query Real Job Opportunities) */}
        <section id="featured-jobs" className="py-16 sm:py-24 bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  Marketplace Feed
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Latest Open Projects
                </h2>
                <p className="mt-2 text-sm text-slate-400 max-w-xl">
                  Real client projects currently open for proposals. Review budgets, required skills, and timeline expectations.
                </p>
              </div>

              <Link
                to="/jobs"
                id="browse-all-jobs-link"
                className="inline-flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors group"
              >
                <span>Browse All Jobs</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Loading State Skeleton */}
            {jobsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 animate-pulse space-y-4"
                  >
                    <div className="h-4 bg-slate-800 rounded w-1/4" />
                    <div className="h-6 bg-slate-800 rounded w-3/4" />
                    <div className="h-16 bg-slate-800 rounded w-full" />
                    <div className="h-8 bg-slate-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Error or Empty State */}
            {!jobsLoading && (jobsError || publicJobs.length === 0) && (
              <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-950 max-w-2xl mx-auto">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  💼
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Open Jobs Right Now</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  Check back soon or post a new job for skilled freelancers on the marketplace.
                </p>
                <Link
                  to={user?.role === "client" ? "/jobs/create" : "/register"}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
                >
                  Post a Job on Freelancr
                </Link>
              </div>
            )}

            {/* Real Jobs List Grid */}
            {!jobsLoading && publicJobs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publicJobs.slice(0, 4).map((job) => (
                  <JobCard key={job._id} job={job} showSaveButton={Boolean(user)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. Categories & Disciplines: Refined Asymmetric Cards */}
        <section id="categories" className="py-16 sm:py-24 bg-slate-950 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Expertise Discovery
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
                Top Marketplace Categories
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-400">
                Connect with vetted talent across key software, product, and creative disciplines.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {POPULAR_CATEGORIES.map((cat) => (
                <Link
                  key={cat.name}
                  to={`/jobs?category=${encodeURIComponent(cat.query)}`}
                  className="group p-6 sm:p-7 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xs hover:border-indigo-500/50 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-indigo-950/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                        {cat.icon}
                      </div>
                      <span className="text-[10px] font-mono uppercase bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                        {cat.demand}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400">
                    <span>Explore opportunities</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 5. How Freelancr Works: Visually Connected Sequence */}
        <section id="how-it-works" className="py-16 sm:py-24 bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Milestone Execution Framework
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
                How Freelancr Works
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-400">
                A structured, milestone-oriented lifecycle built to prevent misunderstandings and protect deliverable quality.
              </p>
            </div>

            {/* Stepped Process with Connected Visual Rhythm */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 relative">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 text-white font-mono font-black flex items-center justify-center text-xs">
                      01
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 uppercase">Requirement</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Scope & Post</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Clients define explicit project scopes, deliverable expectations, and milestone budgets.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] font-medium text-slate-500">
                  Fixed or Milestone Model
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-mono font-black flex items-center justify-center text-xs">
                      02
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 uppercase">Proposals</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Bids & Timelines</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Freelancers review requirements and submit transparent proposals with custom timelines.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] font-medium text-slate-500">
                  Direct Cover Letters
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-mono font-black flex items-center justify-center text-xs">
                      03
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 uppercase">Commitment</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Contract & Escrow</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Proposal acceptance forms a formal contract with milestone funds safely committed in platform records.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] font-medium text-slate-500">
                  Milestone Security
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-mono font-black flex items-center justify-center text-xs">
                      04
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 uppercase">Verification</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Deliver & Inspect</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Work is submitted per milestone. The client reviews outputs, requests edits, or signs off.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] font-medium text-slate-500">
                  Versioned Reviews
                </div>
              </div>

              {/* Step 5 */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono font-black flex items-center justify-center text-xs">
                      05
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 uppercase">Disbursal</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">Payout & Reviews</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Funds release to the freelancer wallet upon verification. Both parties exchange authentic reviews.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-800/80 text-[11px] font-medium text-slate-500">
                  Authenticated Feedback
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Dual Platform Solutions (Clients vs. Freelancers) */}
        <section className="py-16 sm:py-24 bg-slate-950 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Tailored Solutions
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
                Engineered for Both Marketplace Roles
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* For Businesses & Clients */}
              <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-950 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-800/60 mb-5">
                    For Businesses & Clients
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Hire with clarity, pay with confidence
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">
                    Eliminate scope ambiguity. Post your technical project and manage contractors through verified milestones with clear deliverables.
                  </p>

                  <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Post fixed or milestone project specifications with targeted skill requirements.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Compare transparent proposals with explicit bids, cover letters, and delivery dates.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Inspect milestone submissions before approving release of committed funds.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Track payments with complete ledger receipts and dispute mediation workflows.</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to={user?.role === "client" ? "/jobs/create" : "/register"}
                  className="w-full text-center py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
                >
                  {user?.role === "client" ? "Post a New Project" : "Register as a Client"}
                </Link>
              </div>

              {/* For Freelancers & Creators */}
              <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-950 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-800/60 mb-5">
                    For Independent Specialists
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Find quality work, receive timely payouts
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">
                    Focus on writing great code and shipping standout products. Freelancr safeguards your time with formal contracts and transparent payment releases.
                  </p>

                  <ul className="space-y-3.5 text-xs sm:text-sm text-slate-300">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Discover client jobs filtered by tech stack, project budget, and experience level.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Submit competitive proposals with tailored cover letters and milestones.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Submit deliverables per milestone with structured notes and audit logs.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Receive earned balances in your dedicated platform wallet with payout controls.</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/jobs"
                  className="w-full text-center py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-slate-100 text-slate-950 shadow-sm transition-all cursor-pointer"
                >
                  Explore Available Projects
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Platform Integrity & Genuine Safeguards */}
        <section id="marketplace-trust" className="py-16 sm:py-24 bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Reliability & Protection
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-white tracking-tight">
                Designed for Platform Accountability
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Built-in guardrails ensure fair interactions, role-based protection, and complete auditability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-indigo-400 border border-slate-800 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Role-Based Security</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Strict authorization boundaries separate client, freelancer, and administrative actions, preventing unauthorized project modifications.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Milestone-Guarded Settlement</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Funds correspond to concrete deliverables. Release occurs upon client approval, supported by administrative dispute mechanisms.
                </p>
              </div>

              <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-indigo-400 border border-slate-800 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Authenticated Feedback</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Reviews are strictly tied to completed contracts. No fabricated testimonials or unverified rating scores.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Final Call to Action */}
        <section className="py-16 sm:py-24 bg-slate-950 text-white text-center relative overflow-hidden border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              Ready to start your next freelance project?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Join Freelancr today as a client looking for skilled expertise or as an independent specialist ready to build great work.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={user ? (user.role === "client" ? "/jobs/create" : "/dashboard") : "/register"}
                id="cta-join-freelancr-btn"
                className="inline-flex items-center justify-center px-7 py-3 rounded-xl font-bold text-xs sm:text-sm bg-white text-slate-950 hover:bg-slate-100 shadow-lg transition-all active:scale-[0.99] cursor-pointer"
              >
                {user ? "Go to Workspace" : "Get Started Now"}
              </Link>
              <Link
                to="/jobs"
                id="cta-browse-jobs-btn"
                className="inline-flex items-center justify-center px-7 py-3 rounded-xl font-semibold text-xs sm:text-sm border border-slate-800 bg-slate-900/90 text-white hover:bg-slate-800 transition-all active:scale-[0.99] cursor-pointer"
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
