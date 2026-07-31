"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  addAddon,
  cancelAddon,
  getOrCreateSubscription,
  removeCard,
  retryChargeNow,
} from "@/lib/billing/lifecycle";

/**
 * Server actions for the payment center.
 *
 * Every one re-checks the session. middleware.ts already gates /admin, but a
 * Server Action is a POST to the page's own endpoint and these move money —
 * the gate belongs on the action itself, not only on the route that renders
 * the button.
 */

function refresh() {
  revalidatePath("/admin/billing");
}

export async function addAgentAddon(formData: FormData): Promise<void> {
  if (!(await getSession())) return;
  const code = String(formData.get("code") ?? "").trim();
  const sub = await getOrCreateSubscription();
  if (!sub || !code) return;
  await addAddon(sub.id, code);
  refresh();
}

export async function cancelAgentAddon(formData: FormData): Promise<void> {
  if (!(await getSession())) return;
  const code = String(formData.get("code") ?? "").trim();
  const sub = await getOrCreateSubscription();
  if (!sub || !code) return;
  await cancelAddon(sub.id, code);
  refresh();
}

/** Past-due banner button. The outcome lands in the statement either way. */
export async function retryPayment(): Promise<void> {
  if (!(await getSession())) return;
  const sub = await getOrCreateSubscription();
  if (!sub) return;
  await retryChargeNow(sub.id);
  refresh();
}

export async function removeCardOnFile(): Promise<void> {
  if (!(await getSession())) return;
  const sub = await getOrCreateSubscription();
  if (!sub) return;
  await removeCard(sub.id);
  refresh();
}
