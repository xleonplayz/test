"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitContact } from "@/app/actions/contact";
import type { ContactField, ContactState } from "@/lib/types";
import { plans } from "@/lib/plans";
import type { ContactDict, Locale } from "@/lib/i18n";

interface ContactFormProps {
  lang: Locale;
  dict: ContactDict;
  defaultPlan?: string;
}

const initialState: ContactState = { status: "idle" };

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-block" disabled={pending} aria-busy={pending}>
      {pending ? busy : idle}
    </button>
  );
}

export function ContactForm({ lang, dict, defaultPlan }: ContactFormProps) {
  const [state, formAction] = useFormState(submitContact, initialState);

  const errorFor = (field: ContactField): string | undefined =>
    state.status === "error" ? state.fieldErrors[field] : undefined;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="lang" value={lang} />

      {state.status === "success" ? (
        <div className="form-alert is-success" role="status">
          {state.message}
        </div>
      ) : null}
      {state.status === "error" ? (
        <div className="form-alert is-error" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="form-field">
        <label htmlFor="cf-name">{dict.name}</label>
        <input id="cf-name" name="name" type="text" autoComplete="name" required />
        {errorFor("name") ? (
          <span className="field-error" role="alert">
            {errorFor("name")}
          </span>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="cf-email">{dict.email}</label>
        <input id="cf-email" name="email" type="email" autoComplete="email" required />
        {errorFor("email") ? (
          <span className="field-error" role="alert">
            {errorFor("email")}
          </span>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="cf-company">{dict.company}</label>
        <input id="cf-company" name="company" type="text" autoComplete="organization" required />
        {errorFor("company") ? (
          <span className="field-error" role="alert">
            {errorFor("company")}
          </span>
        ) : null}
      </div>

      <div className="form-field">
        <label htmlFor="cf-plan">{dict.plan}</label>
        <select id="cf-plan" name="plan" defaultValue={defaultPlan ?? "growth"}>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="cf-message">{dict.message}</label>
        <textarea id="cf-message" name="message" required minLength={20} />
        {errorFor("message") ? (
          <span className="field-error" role="alert">
            {errorFor("message")}
          </span>
        ) : null}
      </div>

      <SubmitButton idle={dict.submit} busy={dict.submitting} />
    </form>
  );
}
