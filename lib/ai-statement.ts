// The one statement of how Govern uses AI, shared by the security page, the
// legal pages, the product page and the home page so they can never disagree.
// Accurate to the code: AI (OpenAI, via Sonar) extracts and labels; rating
// against the matrix is rule-based (sow-analyser-backend shared/govern/matrix.py).

export const AI_STATEMENT_SHORT =
  "Sonar's AI reads the agreement. Your matrix's rules rate each clause."

export const AI_STATEMENT =
  "Sonar uses AI to read each agreement: it finds and labels every clause and pulls out the parties, dates and money. " +
  "Each clause is then rated against your matrix by the matrix's own rules, not by the AI, so the same clause always " +
  "gets the same rating, and every rating names the rule and matrix version behind it."
