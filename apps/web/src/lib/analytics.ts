"use client";

import posthog from "posthog-js";

// The complete list of product events (ARCHITECTURE §8). Add one here only after adding it
// to that table. Nothing is sent unless NEXT_PUBLIC_POSTHOG_KEY is set.

export type AnalyticsEvents = {
  investigation_viewed: { id: string; published: boolean };
  need_opened: { needId: string; rank: number };
  evidence_opened: { evidenceId: string; source: string };
  tab_switched: { tab: string };
  live_run_started: { id: string };
  live_run_completed: { id: string; status: string; durationMs: number };
  eval_case_opened: { caseId: string };
  trace_opened: { id: string };
};

let started = false;

export function initAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (started || !key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    // Explicit events only, no cookies, no recordings: nothing that needs a consent banner.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: "memory",
  });
  started = true;
}

export function track<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  if (started) posthog.capture(event, properties);
}
