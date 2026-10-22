import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ContactDetector } from "../src/utils/contactDetector";

describe("ContactDetector Unit Test Suite", () => {
  describe("1. Email Detection", () => {
    it("detects standard email addresses", () => {
      assert.equal(ContactDetector.detectEmail("Please email me at john.doe@example.com for details"), true);
      assert.equal(ContactDetector.detectEmail("Reach out: dev_team+freelance@company.co.in"), true);
    });

    it("detects common obfuscated email formats", () => {
      assert.equal(ContactDetector.detectEmail("Contact me at john.doe [at] gmail [dot] com"), true);
      assert.equal(ContactDetector.detectEmail("My email is dev(at)startup(dot)io"), true);
      assert.equal(ContactDetector.detectEmail("email me: user at domain dot com"), true);
      assert.equal(ContactDetector.detectEmail("write to mailto:freelancer@test.org"), true);
    });

    it("does not false-positive on ordinary text", () => {
      assert.equal(ContactDetector.detectEmail("Built with React and Node.js on AWS"), false);
      assert.equal(ContactDetector.detectEmail("I am looking at the requirements dot by dot"), false);
      assert.equal(ContactDetector.detectEmail("We will meet at 5pm"), false);
    });
  });

  describe("2. Phone Number Detection", () => {
    it("detects international phone numbers", () => {
      assert.equal(ContactDetector.detectPhone("Call me at +91 9876543210 for quick response"), true);
      assert.equal(ContactDetector.detectPhone("Reach me: +1-555-123-4567"), true);
      assert.equal(ContactDetector.detectPhone("My phone is +44 20 7946 0958"), true);
    });

    it("detects domestic and separated 10-digit numbers", () => {
      assert.equal(ContactDetector.detectPhone("Call (555) 123-4567 anytime"), true);
      assert.equal(ContactDetector.detectPhone("Phone: 9876543210"), true);
      assert.equal(ContactDetector.detectPhone("Number is 98765 43210"), true);
    });

    it("does not false-positive on technical versions, ports, and dates", () => {
      assert.equal(ContactDetector.detectPhone("Built with Next.js 14 and Node.js 20.3 on AWS EC2"), false);
      assert.equal(ContactDetector.detectPhone("Python 3.10; API version v1.2.3"), false);
      assert.equal(ContactDetector.detectPhone("The endpoint returns 200 OK or 404 Not Found"), false);
      assert.equal(ContactDetector.detectPhone("Estimated budget: ₹15,000; delivery in 10 days"), false);
      assert.equal(ContactDetector.detectPhone("$50/hr for the requested work, total $1,500"), false);
      assert.equal(ContactDetector.detectPhone("Runs on 127.0.0.1:8080 and listens to port 3000"), false);
    });
  });

  describe("3. Messaging Handles & External Direct Contacts", () => {
    it("detects WhatsApp and Telegram direct links", () => {
      assert.equal(ContactDetector.detectMessaging("Message me on https://wa.me/919876543210"), true);
      assert.equal(ContactDetector.detectMessaging("Text me here: wa.me/1234567890"), true);
      assert.equal(ContactDetector.detectMessaging("Join channel: t.me/freelancer_pro"), true);
      assert.equal(ContactDetector.detectMessaging("https://discord.gg/invite123"), true);
    });

    it("detects explicit off-platform prompts", () => {
      assert.equal(ContactDetector.detectMessaging("Contact me on WhatsApp to discuss further"), true);
      assert.equal(ContactDetector.detectMessaging("Ping me via telegram for direct chat"), true);
      assert.equal(ContactDetector.detectMessaging("My skype id is dev_expert"), true);
    });

    it("does not false-positive on legitimate technical portfolio or repository prose", () => {
      assert.equal(ContactDetector.detectMessaging("Check my code at github.com/developer/portfolio"), false);
      assert.equal(ContactDetector.detectMessaging("Experienced with Discord bot API development"), false);
      assert.equal(ContactDetector.detectMessaging("I have integrated Telegram webhooks before"), false);
    });
  });

  describe("4. Composite Proposal Content Screening", () => {
    it("screens clean proposals as clean", () => {
      const coverLetter = "I have 5+ years of fullstack experience with TypeScript, React, and Node.js. " +
        "I reviewed your job requirements and can deliver within the 14-day timeline for $1,200. " +
        "Check my previous open-source projects on GitHub.";
      const attachments = ["https://res.cloudinary.com/demo/image/upload/sample.pdf"];

      const result = ContactDetector.screenProposalContent(coverLetter, attachments);
      assert.equal(result.hasContactInfo, false);
      assert.equal(result.categories.length, 0);
    });

    it("flags contact info in cover letter", () => {
      const coverLetter = "I can do this easily. Please email me at candidate@test.com to discuss.";
      const result = ContactDetector.screenProposalContent(coverLetter);
      assert.equal(result.hasContactInfo, true);
      assert.ok(result.categories.includes("email"));
    });

    it("flags contact info in attachment URL", () => {
      const coverLetter = "I have 5 years experience with Node.js and TypeScript. Budget is ₹15,000 for 10 days.";
      const attachments = ["https://wa.me/919876543210"];

      const result = ContactDetector.screenProposalContent(coverLetter, attachments);
      assert.equal(result.hasContactInfo, true);
      assert.ok(result.categories.includes("messaging"));
    });
  });
});
