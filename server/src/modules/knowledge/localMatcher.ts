/**
 * Pure local text normalizer and tokenization utility.
 * Cleans punctuation, removes common English stop words, and creates a token bag.
 */
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
  "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
  "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
  "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should",
  "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
  "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
  "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
  "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
  "tell", "please", "help"
]);

export function normalizeQuestion(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // replace punctuation with space
    .replace(/\s+/g, " ")     // collapse repeated spaces
    .trim();
}

export function extractTokens(text: string): string[] {
  const norm = normalizeQuestion(text);
  if (!norm) return [];
  return norm
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Calculates deterministic match score between query and knowledge entry.
 * Returns score between 0.0 and 1.0.
 */
export function calculateMatchScore(
  query: string,
  entry: {
    canonicalQuestion: string;
    alternateQuestions?: string[];
    keywords?: string[];
  }
): { score: number; matchedBy: string } {
  const normQuery = normalizeQuestion(query);
  if (!normQuery) return { score: 0, matchedBy: "none" };

  const normCanonical = normalizeQuestion(entry.canonicalQuestion);

  // 1. Exact match on canonical question
  if (normQuery === normCanonical) {
    return { score: 1.0, matchedBy: "exact_canonical" };
  }

  // 2. Exact match on any alternate question
  if (entry.alternateQuestions && entry.alternateQuestions.length > 0) {
    for (const alt of entry.alternateQuestions) {
      if (normalizeQuestion(alt) === normQuery) {
        return { score: 0.98, matchedBy: "exact_alternate" };
      }
    }
  }

  // 3. Substring containment
  if (normCanonical.includes(normQuery) || normQuery.includes(normCanonical)) {
    return { score: 0.90, matchedBy: "substring" };
  }

  // 4. Token overlap calculation
  const queryTokens = new Set(extractTokens(query));
  if (queryTokens.size === 0) {
    return { score: 0, matchedBy: "none" };
  }

  // Check canonical tokens
  const canonicalTokens = extractTokens(entry.canonicalQuestion);
  const altTokens = (entry.alternateQuestions || []).flatMap((alt) => extractTokens(alt));
  const keywordTokens = (entry.keywords || []).map((k) => k.toLowerCase().trim());

  const allTargetTokens = new Set([
    ...canonicalTokens,
    ...altTokens,
    ...keywordTokens,
  ]);

  let matchedTokenCount = 0;
  for (const token of queryTokens) {
    if (allTargetTokens.has(token)) {
      matchedTokenCount += 1;
    }
  }

  const tokenRatio = matchedTokenCount / queryTokens.size;

  // Bonus if keywords directly matched
  const matchedKeywords = (entry.keywords || []).filter((kw) =>
    normQuery.includes(kw.toLowerCase())
  ).length;

  let compositeScore = tokenRatio * 0.75;
  if (matchedKeywords > 0) {
    compositeScore += Math.min(0.25, matchedKeywords * 0.1);
  }

  return {
    score: Math.min(compositeScore, 0.89),
    matchedBy: "token_overlap",
  };
}

