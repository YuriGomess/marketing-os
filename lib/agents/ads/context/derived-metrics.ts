import type { MetaNormalizedActions } from "@/lib/integrations/meta/actions-parser";

export type DerivedAdsMetrics = {
  lpvRate: number;
  lpvCost: number;
  addToCartRate: number;
  addToCartCost: number;
  checkoutRate: number;
  checkoutCost: number;
  purchaseCost: number;
  averageOrderValue: number;
  roas: number;
  costPerFollower: number;
  profileToFollowerRate: number;
  costPerMessage: number;
};

type BaseInputs = {
  spend: number;
  clicks: number;
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}

function round(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
}

export function calculateDerivedAdsMetrics(
  base: BaseInputs,
  actions: MetaNormalizedActions,
): DerivedAdsMetrics {
  const spend = toNumber(base.spend);
  const clicks = toNumber(base.clicks);

  const landingPageViews = toNumber(actions.landingPageViews);
  const addToCart = toNumber(actions.addToCart);
  const initiateCheckout = toNumber(actions.initiateCheckout);
  const purchases = toNumber(actions.purchases);
  const conversionValue = toNumber(actions.conversionValue);
  const followers = toNumber(actions.followers);
  const profileVisits = toNumber(actions.profileVisits);
  const messagingConversations = toNumber(actions.messagingConversations);

  return {
    lpvRate: round(safeDivide(landingPageViews * 100, clicks)),
    lpvCost: round(safeDivide(spend, landingPageViews)),
    addToCartRate: round(safeDivide(addToCart * 100, landingPageViews)),
    addToCartCost: round(safeDivide(spend, addToCart)),
    checkoutRate: round(safeDivide(initiateCheckout * 100, addToCart)),
    checkoutCost: round(safeDivide(spend, initiateCheckout)),
    purchaseCost: round(safeDivide(spend, purchases)),
    averageOrderValue: round(safeDivide(conversionValue, purchases)),
    roas: round(safeDivide(conversionValue, spend)),
    costPerFollower: round(safeDivide(spend, followers)),
    profileToFollowerRate: round(safeDivide(followers * 100, profileVisits)),
    costPerMessage: round(safeDivide(spend, messagingConversations)),
  };
}
