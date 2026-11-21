import { KnowledgeBaseEntry } from "./knowledgeBase.model";

/**
 * Seed initial published FAQs into the local database if none exist yet.
 * Uses atomic upsert ($setOnInsert) keyed on canonicalQuestion to ensure strict
 * idempotency and concurrency safety across parallel process starts without
 * overwriting administrator-authored modifications.
 */
export async function seedInitialKnowledgeBase() {
  try {
    const initialEntries = [
      {
        canonicalQuestion: "How do I apply for a job?",
        alternateQuestions: [
          "How can I submit a proposal?",
          "How do I apply to an open job?",
          "Where do I send my bid?",
        ],
        keywords: ["apply", "job", "proposal", "bid", "submit"],
        category: "proposals",
        answer: "To apply for a job, navigate to 'Find Jobs' from your dashboard sidebar, select an open job opportunity, review the requirements and budget, then click 'Submit Proposal' to enter your bid amount, delivery timeline, and cover letter.",
        status: "published",
      },
      {
        canonicalQuestion: "How do I post a new job?",
        alternateQuestions: [
          "Where can I create a job listing?",
          "How does a client post a job?",
          "How do I hire freelancers?",
        ],
        keywords: ["post", "job", "create", "hire", "client", "listing"],
        category: "jobs",
        answer: "Clients can post jobs by clicking the 'Post Job' button in the top navigation or navigating to 'Post a New Job' (/jobs/create) in their sidebar. Specify project title, required skills, budget range or fixed price, and whether the job is remote.",
        status: "published",
      },
      {
        canonicalQuestion: "Where can I find my messages?",
        alternateQuestions: [
          "How do I message my client or freelancer?",
          "Where is the chat?",
          "How do I view conversation history?",
        ],
        keywords: ["messages", "chat", "conversation", "inbox", "dm"],
        category: "messages",
        answer: "You can access your messages anytime by clicking 'Messages' in your dashboard sidebar. There you can view active conversations, check message history, and compose real-time messages with clients and freelancers.",
        status: "published",
      },
      {
        canonicalQuestion: "How do I update my profile?",
        alternateQuestions: [
          "Where can I edit my skills and bio?",
          "How do I change my onboarding details?",
          "How do I update company information?",
        ],
        keywords: ["profile", "skills", "bio", "edit", "company", "update"],
        category: "profile",
        answer: "You can update your skills, bio, portfolio projects, and availability during onboarding or from your account dashboard. Ensure your contact details and skills stay current to maximize job matching.",
        status: "published",
      },
      {
        canonicalQuestion: "How do I review proposals?",
        alternateQuestions: [
          "Where are proposals submitted to my job?",
          "How does a client accept a proposal?",
          "How do I hire a proposal applicant?",
        ],
        keywords: ["proposals", "review", "accept", "client", "applicant"],
        category: "proposals",
        answer: "Clients can review incoming proposals by navigating to 'My Posted Jobs' (/my-jobs) and clicking 'Review Proposals' on any active listing. From there, you can view applicant profiles, read cover letters, and accept a proposal to connect directly with the freelancer and arrange your project terms independently.",
        status: "published",
      },
      {
        canonicalQuestion: "How do I contact support?",
        alternateQuestions: [
          "How can I submit a support ticket?",
          "How do I reach customer service?",
          "Where do I report an issue?",
        ],
        keywords: ["support", "ticket", "help", "contact", "issue"],
        category: "support",
        answer: "You can ask questions right here in Freelancr Help! If your question cannot be answered automatically, you can click 'Submit to Support Team' to escalate it, or submit a formal ticket via the platform support desk.",
        status: "published",
      },
      {
        canonicalQuestion: "What are the platform fees and payment terms?",
        alternateQuestions: [
          "How much does Freelancr charge?",
          "What is the platform fee?",
          "Are there job posting fees?",
        ],
        keywords: ["fee", "pricing", "cost", "commission", "charge", "payment"],
        category: "payments",
        answer: "Platform revenue is generated through subscriptions and a 10% client job-posting fee plus statutory taxes. Clients and freelancers independently manage their agreements, milestones, and deliverables.",
        status: "published",
      },
    ];

    // Atomically upsert each entry using $setOnInsert.
    // If an entry with this canonicalQuestion already exists (even if edited by an admin),
    // nothing is touched or overwritten.
    // Handles duplicate-key error (E11000) under race conditions by re-verifying entry existence.
    for (const entry of initialEntries) {
      try {
        await KnowledgeBaseEntry.findOneAndUpdate(
          { canonicalQuestion: entry.canonicalQuestion },
          { $setOnInsert: entry },
          { upsert: true, new: false }
        );
      } catch (upsertErr: any) {
        // E11000 duplicate key error indicates a concurrent process inserted the entry first
        if (upsertErr?.code === 11000 || upsertErr?.message?.includes("E11000")) {
          const exists = await KnowledgeBaseEntry.findOne({ canonicalQuestion: entry.canonicalQuestion });
          if (exists) {
            // Safely reconciled: entry was seeded by the competing process
            continue;
          }
        }
        // Re-throw unexpected database failures (connectivity, validation, auth)
        throw upsertErr;
      }
    }
  } catch (err) {
    console.error("Knowledge base initial seed error:", err);
    throw err;
  }
}

