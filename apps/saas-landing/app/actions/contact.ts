"use server";

import { getDictionary, isLocale, defaultLocale, type Locale } from "@/lib/i18n";
import type { ContactField, ContactState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_EMAIL = /@(gmail|yahoo|hotmail|outlook|proton|icloud)\./i;

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("lang") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

/**
 * Server Action for the contact form. Validates each field, returns a typed
 * discriminated-union state so the client can render per-field errors or a
 * success banner. In a real app this would enqueue an email / CRM lead.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const lang = readLocale(formData);
  const t = getDictionary(lang).contact;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const fieldErrors: Partial<Record<ContactField, string>> = {};

  if (!name) fieldErrors.name = t.fieldRequired;
  if (!email) {
    fieldErrors.email = t.fieldRequired;
  } else if (!EMAIL_RE.test(email) || FREE_EMAIL.test(email)) {
    fieldErrors.email = t.emailInvalid;
  }
  if (!company) fieldErrors.company = t.fieldRequired;
  if (!message) {
    fieldErrors.message = t.fieldRequired;
  } else if (message.length < 20) {
    fieldErrors.message = t.messageTooShort;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: t.errorGeneric, fieldErrors };
  }

  // Simulate a small amount of async work (e.g. CRM call).
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In production: persist the lead. Here we just acknowledge it.
  const planLabel = plan || "starter";
  void planLabel;

  return { status: "success", message: t.success };
}
