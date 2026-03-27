/**
 * VCF (vCard) file parser.
 * Handles vCard 2.1, 3.0, and 4.0 formats.
 * Extracts: full_name, email, phone, company, role.
 */

export interface ParsedContact {
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
}

export interface ParseResult {
  contacts: ParsedContact[];
  errors: string[];
}

/** Decode quoted-printable encoding (common in vCard 2.1) */
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "") // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

/** Clean a vCard value — strip type params, quotes, encoding artifacts */
function cleanValue(raw: string): string {
  // Remove leading/trailing whitespace and quotes
  let val = raw.trim().replace(/^["']|["']$/g, "");
  // Handle escaped characters
  val = val.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
  return val;
}

/** Extract the value part from a vCard property line like TEL;TYPE=CELL:+1234 */
function extractValue(line: string): string {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return "";
  return cleanValue(line.slice(colonIdx + 1));
}

/** Check if a property line matches a given property name (case-insensitive) */
function isProperty(line: string, prop: string): boolean {
  const upper = line.toUpperCase();
  return upper.startsWith(prop + ":") || upper.startsWith(prop + ";");
}

/** Parse a single vCard block into a ParsedContact */
function parseVCard(block: string): ParsedContact | null {
  const lines: string[] = [];

  // Unfold continued lines (lines starting with space or tab are continuations)
  for (const rawLine of block.split(/\r?\n/)) {
    if (rawLine.startsWith(" ") || rawLine.startsWith("\t")) {
      if (lines.length > 0) {
        lines[lines.length - 1] += rawLine.slice(1);
      }
    } else {
      lines.push(rawLine);
    }
  }

  let fullName: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let company: string | null = null;
  let role: string | null = null;

  for (let line of lines) {
    // Decode quoted-printable if flagged
    if (line.toUpperCase().includes("ENCODING=QUOTED-PRINTABLE")) {
      line = decodeQuotedPrintable(line);
    }

    if (isProperty(line, "FN")) {
      fullName = extractValue(line);
    } else if (isProperty(line, "N") && !isProperty(line, "NOTE") && !isProperty(line, "NICKNAME")) {
      // N is structured: Last;First;Middle;Prefix;Suffix
      // Only use if FN is not available
      if (!fullName) {
        const parts = extractValue(line).split(";");
        const last = parts[0]?.trim() || "";
        const first = parts[1]?.trim() || "";
        const middle = parts[2]?.trim() || "";
        fullName = [first, middle, last].filter(Boolean).join(" ");
      }
    } else if (isProperty(line, "EMAIL")) {
      if (!email) email = extractValue(line);
    } else if (isProperty(line, "TEL")) {
      if (!phone) phone = extractValue(line);
    } else if (isProperty(line, "ORG")) {
      if (!company) {
        // ORG can be semicolon-separated: Company;Department
        company = extractValue(line).split(";")[0]?.trim() || null;
      }
    } else if (isProperty(line, "TITLE")) {
      if (!role) role = extractValue(line);
    } else if (isProperty(line, "ROLE")) {
      if (!role) role = extractValue(line);
    }
  }

  // Skip contacts with no name at all
  if (!fullName || fullName.trim() === "") {
    // Try to derive name from email
    if (email) {
      const local = email.split("@")[0];
      fullName = local
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    } else {
      return null;
    }
  }

  return {
    full_name: fullName.trim(),
    email: email || null,
    phone: phone || null,
    company: company || null,
    role: role || null,
  };
}

/** Parse an entire VCF file (may contain multiple vCards) */
export function parseVCF(content: string): ParseResult {
  const contacts: ParsedContact[] = [];
  const errors: string[] = [];

  // Split into individual vCard blocks
  const blocks = content.split(/BEGIN:VCARD/i).slice(1); // first split is empty/preamble

  if (blocks.length === 0) {
    errors.push("No vCard entries found in file");
    return { contacts, errors };
  }

  for (let i = 0; i < blocks.length; i++) {
    try {
      const block = blocks[i];
      const endIdx = block.toUpperCase().indexOf("END:VCARD");
      const cardContent = endIdx >= 0 ? block.slice(0, endIdx) : block;

      const parsed = parseVCard(cardContent);
      if (parsed) {
        contacts.push(parsed);
      }
    } catch {
      errors.push(`Failed to parse contact #${i + 1}`);
    }
  }

  return { contacts, errors };
}
