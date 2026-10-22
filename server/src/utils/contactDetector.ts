export interface ContactDetectionResult {
  hasContactInfo: boolean;
  categories: ("email" | "phone" | "messaging")[];
  reason?: string;
}

/**
 * Pure utility to screen user-supplied text and attachment URLs for prohibited off-platform contact information.
 *
 * Designed with conservative patterns to prevent false positives on:
 * - Technical versions (e.g. "Node.js 20.3.0", "Python 3.10", "v1.2.3")
 * - HTTP status codes and ports (e.g. "returns 200 OK or 404", "localhost:8080")
 * - Commercial budgets and numbers (e.g. "₹15,000", "$50/hr", "10 days")
 *
 * Screened categories:
 * 1. Email addresses (standard and common obfuscations like [at], (at), dot, etc.)
 * 2. Phone numbers (standard domestic/international formats, clusters of 10+ digits)
 * 3. Messaging links / handles (e.g. wa.me, t.me, discord.gg, skype:, explicit "call/text me at...")
 */
export class ContactDetector {
  private static readonly MAX_INPUT_LENGTH = 10000;

  /**
   * Normalizes common text obfuscations while preserving text length limits.
   */
  private static normalizeText(input: string): string {
    if (!input || typeof input !== "string") return "";
    let text = input.slice(0, this.MAX_INPUT_LENGTH);

    // Replace common email/domain obfuscation tokens
    // [at], (at), {at}, <at>, \bat\b
    text = text.replace(/\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\}|<\s*at\s*>/gi, "@");
    // [dot], (dot), {dot}, <dot>
    text = text.replace(/\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|<\s*dot\s*>/gi, ".");

    return text;
  }

  /**
   * Checks for email addresses (standard or obfuscated).
   */
  public static detectEmail(text: string): boolean {
    const normalized = this.normalizeText(text);

    // Standard email or spaced email pattern: username @ domain . tld
    const emailPattern = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s+at\s+)[a-zA-Z0-9.-]+\s*(?:\.|\s+dot\s+)[a-zA-Z]{2,}/i;
    if (emailPattern.test(normalized)) {
      return true;
    }

    // mailto: links
    if (/mailto:\s*[^\s]+/i.test(normalized)) {
      return true;
    }

    return false;
  }

  /**
   * Checks for phone numbers while protecting against version numbers, prices, and date/time expressions.
   */
  public static detectPhone(text: string): boolean {
    if (!text || typeof text !== "string") return false;

    // 1. Explicit international format with plus sign (e.g. +91 9876543210, +1-555-123-4567)
    const intlPhonePattern = /(?:^|[^\w.+])\+(?:[0-9][\s.-]?){8,14}[0-9](?=[^\w.]|$)/;
    if (intlPhonePattern.test(text)) {
      return true;
    }

    // 2. Domestic formatted numbers with parentheses or dashes (e.g., (123) 456-7890, 09876-543210, 98765-43210)
    const formattedPhonePattern = /(?:^|[^\w])(?:\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})(?=[^\w]|$)/;
    if (formattedPhonePattern.test(text)) {
      return true;
    }

    // 3. Obvious sequence of 10 to 12 digits, possibly separated by spaces or dashes
    // To avoid false positives on monetary numbers (e.g. 100,000 or 15,000) or decimal versions (1.2.3.4),
    // we require either 10+ contiguous digits or 10-12 digits separated strictly by spaces or dashes,
    // and ensure it is not preceded by currency symbols (₹, $, €, £, INR, USD).
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      // Find candidate digit groups with spaces/dashes
      const matches = line.matchAll(/(?:^|[^\d₹$€£\w])(\d(?:[\s.-]?\d){9,13})(?=[^\d\w]|$)/g);
      for (const match of matches) {
        const candidate = match[1];
        // Strip non-digits
        const digitsOnly = candidate.replace(/\D/g, "");

        // If digits count is 10 to 14
        if (digitsOnly.length >= 10 && digitsOnly.length <= 14) {
          // Check if candidate contains periods. If it contains multiple periods, it might be an IP address or version
          const periodCount = (candidate.match(/\./g) || []).length;
          if (periodCount >= 2) {
            continue; // likely IP or multi-part version
          }
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Checks for messaging links (WhatsApp, Telegram, Discord, Skype, etc.) or explicit off-platform prompts.
   */
  public static detectMessaging(text: string): boolean {
    if (!text || typeof text !== "string") return false;
    const normalized = text.toLowerCase();

    // Prohibited off-platform messaging domains & URL schemes
    const messagingDomains = [
      /wa\.me\//,
      /api\.whatsapp\.com/,
      /chat\.whatsapp\.com/,
      /t\.me\//,
      /telegram\.me\//,
      /discord\.gg\//,
      /discord\.com\/invite\//,
      /join\.skype\.com/,
      /skype:/,
    ];

    for (const pattern of messagingDomains) {
      if (pattern.test(normalized)) {
        return true;
      }
    }

    // Explicit requests to exchange contact via external platforms with handle/number
    // e.g. "contact me on whatsapp", "reach me at telegram", "my skype id is..."
    const handlePrompt = /(?:contact|reach|message|ping|chat|call|text|connect with)\s+me\s+(?:on|at|via|through)?\s*(?:whatsapp|telegram|skype|discord|wechat|signal)\b/i;
    if (handlePrompt.test(normalized)) {
      return true;
    }

    const platformIdPrompt = /(?:my|our)\s+(?:whatsapp|telegram|skype|discord)\s+(?:is|id|handle|number)\b/i;
    if (platformIdPrompt.test(normalized)) {
      return true;
    }

    return false;
  }

  /**
   * Comprehensive screen of a single text content or URL string.
   */
  public static screenText(text: string): ContactDetectionResult {
    if (!text || typeof text !== "string") {
      return { hasContactInfo: false, categories: [] };
    }

    const categories: ("email" | "phone" | "messaging")[] = [];

    if (this.detectEmail(text)) {
      categories.push("email");
    }

    if (this.detectPhone(text)) {
      categories.push("phone");
    }

    if (this.detectMessaging(text)) {
      categories.push("messaging");
    }

    if (categories.length > 0) {
      return {
        hasContactInfo: true,
        categories,
        reason: `Prohibited contact information detected (${categories.join(", ")}). Direct contact exchange is not permitted.`,
      };
    }

    return { hasContactInfo: false, categories: [] };
  }

  /**
   * Screens proposal user inputs (cover letter and attachment URLs).
   */
  public static screenProposalContent(
    coverLetter: string,
    attachments?: string[]
  ): ContactDetectionResult {
    // 1. Screen cover letter
    const coverResult = this.screenText(coverLetter);
    if (coverResult.hasContactInfo) {
      return coverResult;
    }

    // 2. Screen attachment URL strings
    if (Array.isArray(attachments)) {
      for (const url of attachments) {
        if (typeof url === "string") {
          const urlResult = this.screenText(url);
          if (urlResult.hasContactInfo) {
            return {
              hasContactInfo: true,
              categories: urlResult.categories,
              reason: `Attachment link contains prohibited contact information (${urlResult.categories.join(", ")}).`,
            };
          }
        }
      }
    }

    return { hasContactInfo: false, categories: [] };
  }
}
