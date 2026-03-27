/**
 * CSV contact parser with auto-detection of column headers.
 * Handles common header aliases from Google Contacts, Outlook, Apple, etc.
 */

import type { ParsedContact } from "./vcf-parser";

export interface CSVParseResult {
  contacts: ParsedContact[];
  errors: string[];
  headers: string[];
  columnMapping: Record<string, string>;
}

/** Common aliases for each contact field */
const HEADER_ALIASES: Record<string, string[]> = {
  full_name: [
    "name", "full name", "full_name", "fullname", "display name",
    "contact name", "contact", "person", "first name + last name",
  ],
  first_name: ["first name", "first_name", "firstname", "given name", "given_name"],
  last_name: ["last name", "last_name", "lastname", "surname", "family name", "family_name"],
  email: [
    "email", "email address", "e-mail", "email1", "primary email",
    "e-mail address", "email_address", "work email", "personal email",
  ],
  phone: [
    "phone", "phone number", "telephone", "mobile", "cell", "mobile phone",
    "cell phone", "phone1", "primary phone", "work phone", "home phone",
  ],
  company: [
    "company", "organization", "organisation", "org", "company name",
    "employer", "business", "work",
  ],
  role: [
    "title", "job title", "role", "position", "job", "designation",
    "job_title", "jobtitle",
  ],
};

/** Parse a CSV line respecting quoted fields */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Auto-detect which CSV column maps to which contact field */
function detectColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (aliases.includes(normalizedHeaders[i])) {
        mapping[field] = i;
        break;
      }
    }
  }

  return mapping;
}

/** Parse CSV content into contacts */
export function parseCSV(content: string): CSVParseResult {
  const contacts: ParsedContact[] = [];
  const errors: string[] = [];

  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    errors.push("CSV file must have a header row and at least one data row");
    return { contacts, errors, headers: [], columnMapping: {} };
  }

  const headers = parseCSVLine(lines[0]);
  const colMap = detectColumnMapping(headers);

  // Build a human-readable column mapping for the UI
  const columnMapping: Record<string, string> = {};
  for (const [field, idx] of Object.entries(colMap)) {
    columnMapping[field] = headers[idx];
  }

  // Need at least a name field
  const hasName = colMap.full_name !== undefined;
  const hasFirstLast = colMap.first_name !== undefined || colMap.last_name !== undefined;

  if (!hasName && !hasFirstLast) {
    errors.push(
      `Could not detect a name column. Found headers: ${headers.join(", ")}. ` +
      `Expected one of: Name, Full Name, First Name, Last Name`
    );
    return { contacts, errors, headers, columnMapping };
  }

  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i]);

      let fullName = "";
      if (colMap.full_name !== undefined) {
        fullName = fields[colMap.full_name]?.trim() || "";
      }
      if (!fullName && (colMap.first_name !== undefined || colMap.last_name !== undefined)) {
        const first = colMap.first_name !== undefined ? fields[colMap.first_name]?.trim() || "" : "";
        const last = colMap.last_name !== undefined ? fields[colMap.last_name]?.trim() || "" : "";
        fullName = [first, last].filter(Boolean).join(" ");
      }

      if (!fullName) continue; // skip empty rows

      contacts.push({
        full_name: fullName,
        email: colMap.email !== undefined ? fields[colMap.email]?.trim() || null : null,
        phone: colMap.phone !== undefined ? fields[colMap.phone]?.trim() || null : null,
        company: colMap.company !== undefined ? fields[colMap.company]?.trim() || null : null,
        role: colMap.role !== undefined ? fields[colMap.role]?.trim() || null : null,
      });
    } catch {
      errors.push(`Failed to parse row ${i + 1}`);
    }
  }

  return { contacts, errors, headers, columnMapping };
}
