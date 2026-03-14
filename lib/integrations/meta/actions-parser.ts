type MetaActionEntry = {
  action_type?: string;
  value?: string | number;
};

export type MetaNormalizedActions = {
  landingPageViews: number;
  addToCart: number;
  initiateCheckout: number;
  purchases: number;
  conversionValue: number;
  messagingConversations: number;
  profileVisits: number;
  followers: number;
  leads: number;
  linkClicks: number;
  purchaseRoas: number;
};

const EMPTY_ACTIONS: MetaNormalizedActions = {
  landingPageViews: 0,
  addToCart: 0,
  initiateCheckout: 0,
  purchases: 0,
  conversionValue: 0,
  messagingConversations: 0,
  profileVisits: 0,
  followers: 0,
  leads: 0,
  linkClicks: 0,
  purchaseRoas: 0,
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asActionList(input: unknown): MetaActionEntry[] {
  if (!Array.isArray(input)) return [];
  return input.filter((item) => item && typeof item === "object") as MetaActionEntry[];
}

function normalizeActionName(input: string | undefined): string {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function hasAny(actionName: string, terms: string[]): boolean {
  return terms.some((term) => actionName.includes(term));
}

function sumByMatcher(list: MetaActionEntry[], matcher: (actionName: string) => boolean): number {
  return list.reduce((sum, entry) => {
    const actionName = normalizeActionName(entry.action_type);
    if (!matcher(actionName)) return sum;
    return sum + toNumber(entry.value);
  }, 0);
}

function extractPurchaseRoas(input: unknown): number {
  if (Array.isArray(input)) {
    const entries = asActionList(input);
    const purchaseRoas = sumByMatcher(entries, (actionName) =>
      hasAny(actionName, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]),
    );
    return purchaseRoas;
  }

  return toNumber(input);
}

export function normalizeMetaActions(input: {
  actions?: unknown;
  actionValues?: unknown;
  costPerActionType?: unknown;
  purchaseRoas?: unknown;
  clicks?: unknown;
}): MetaNormalizedActions {
  const actions = asActionList(input.actions);
  const actionValues = asActionList(input.actionValues);
  const costPerActionType = asActionList(input.costPerActionType);

  const landingPageViews = sumByMatcher(actions, (actionName) =>
    hasAny(actionName, ["landing_page_view", "landing_page_views", "omni_view_content"]),
  );

  const addToCart = sumByMatcher(actions, (actionName) =>
    hasAny(actionName, ["add_to_cart", "omni_add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"]),
  );

  const initiateCheckout = sumByMatcher(actions, (actionName) =>
    hasAny(actionName, [
      "initiate_checkout",
      "initiated_checkout",
      "omni_initiated_checkout",
      "offsite_conversion.fb_pixel_initiate_checkout",
    ]),
  );

  const purchases = sumByMatcher(actions, (actionName) =>
    hasAny(actionName, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]),
  );

  const conversionValue = sumByMatcher(actionValues, (actionName) =>
    hasAny(actionName, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]),
  );

  const messagingConversations = sumByMatcher(actions, (actionName) =>
    hasAny(actionName, [
      "messaging_conversation",
      "onsite_conversion.messaging_conversation_started",
      "onsite_conversion.messaging_first_reply",
    ]),
  );

  const profileVisits = sumByMatcher(actions, (actionName) =>
    hasAny(actionName, ["profile_visit", "ig_profile_visit", "page_engagement"]),
  );

  const followers = sumByMatcher(actions, (actionName) =>
    hasAny(actionName, ["follow", "ig_follow", "instagram_profile_follow", "new_followers"]),
  );

  const leads = sumByMatcher(actions, (actionName) => hasAny(actionName, ["lead", "onsite_conversion.lead_grouped"]));

  const linkClicksFromActions = sumByMatcher(actions, (actionName) => hasAny(actionName, ["link_click", "outbound_click"]));
  const linkClicks = linkClicksFromActions > 0 ? linkClicksFromActions : toNumber(input.clicks);

  const purchaseRoas = extractPurchaseRoas(input.purchaseRoas);

  // Keep parser robust even when this array is absent in specific objectives.
  if (costPerActionType.length === 0) {
    return {
      ...EMPTY_ACTIONS,
      landingPageViews,
      addToCart,
      initiateCheckout,
      purchases,
      conversionValue,
      messagingConversations,
      profileVisits,
      followers,
      leads,
      linkClicks,
      purchaseRoas,
    };
  }

  return {
    ...EMPTY_ACTIONS,
    landingPageViews,
    addToCart,
    initiateCheckout,
    purchases,
    conversionValue,
    messagingConversations,
    profileVisits,
    followers,
    leads,
    linkClicks,
    purchaseRoas,
  };
}
