type AnalyticsProps = Record<string, string | number | boolean | undefined | null>;

/**
 * Lightweight analytics stub.
 * Swap `track` body for Amplitude / PostHog / Firebase Analytics in production.
 */
export function track(event: string, props?: AnalyticsProps) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, props ?? {});
  }
  // Production: send to your provider
  // e.g. posthog.capture(event, props)
}

export function identify(userId: string, traits?: AnalyticsProps) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] identify ${userId}`, traits ?? {});
  }
}

export const AnalyticsEvents = {
  signIn: 'auth_sign_in',
  onboardingComplete: 'onboarding_complete',
  vacancyView: 'vacancy_view',
  vacancyApply: 'vacancy_apply',
  taskCreate: 'task_create',
  taskAccept: 'task_accept',
  taskComplete: 'task_complete',
  escrowHold: 'escrow_hold',
  escrowRelease: 'escrow_release',
  chatOpen: 'chat_open',
  reviewSubmit: 'review_submit',
} as const;
