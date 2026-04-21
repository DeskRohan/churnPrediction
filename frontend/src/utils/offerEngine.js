/**
 * offerEngine.js
 * Central offer engine — maps churn reasons to targeted retention offers.
 * Used by both the Predictor (trigger event) and Customers (intel modal).
 *
 * Each offer now includes What-If Simulation data:
 *   - reductionPct  : how much churn probability drops (%) when this offer is applied
 *   - retentionRate : historical success rate of this offer type (for credibility)
 *   - savingsNote   : revenue-impact callout
 */

export const CHURN_REASONS = [
  { value: 'price', label: 'Price Too High' },
  { value: 'competitor', label: 'Moved to Competitor' },
  { value: 'service_dissatisfaction', label: 'Dissatisfied with Service' },
  { value: 'product_dissatisfaction', label: 'Product Not Meeting Needs' },
  { value: 'support', label: 'Poor Customer Support' },
  { value: 'network', label: 'Network / Reliability Issues' },
  { value: 'moving', label: 'Customer Is Moving' },
  { value: 'no_reason', label: 'No Reason Provided' },
];

/**
 * Returns a tailored offer object based on a churn reason key.
 * @param {string} reason - churn reason key from CHURN_REASONS
 * @returns {{ title, description, discount, badge, color, icon, action, reductionPct, retentionRate, savingsNote }}
 */
export const getOfferForReason = (reason) => {
  const offerMap = {
    price: {
      title: '25% Loyalty Discount',
      description:
        'Customer flagged price as their exit reason. Deploy an immediate 25% recurring discount for 3 months to bridge the value gap and retain MRR.',
      discount: '25% OFF — 3 Months',
      badge: 'Price Retention',
      color: '#4F7C82',
      colorBg: '#EBF5F6',
      icon: '💰',
      action: 'Apply Discount Code',
      reductionPct: 62,
      retentionRate: 78,
      savingsNote: 'Historically recovers 78% of price-sensitive churners',
      messageTemplate: "Subject: A Special Loyalty Gift for [Name] 🎁\n\nHi [Name],\n\nWe noticed you've been evaluating our pricing recently. We value your loyalty, so we've applied an exclusive 25% discount to your account for the next 3 months. No action needed – it's already waiting for you.\n\nBest, EcoRetain Team"
    },
    competitor: {
      title: 'Competitive Win-Back Bundle',
      description:
        'Lost to a competitor. Offer a feature upgrade + price match guarantee to make switching back compelling. Highlight unique differentiators.',
      discount: 'Feature Upgrade + Price Match',
      badge: 'Win-Back Offer',
      color: '#7C5CBF',
      colorBg: '#F3EFFD',
      icon: '🏆',
      action: 'Send Win-Back Package',
      reductionPct: 55,
      retentionRate: 64,
      savingsNote: 'Win-back bundles retain 64% of competitor-lost accounts',
      messageTemplate: "Subject: Don't miss out on these new upgrades, [Name]! 🏆\n\nHi [Name],\n\nWe'd love to have you back. We've unlocked a Premium Feature Upgrade and a Price Match Guarantee just for your account. Let's get you set up with the best tools in the industry.\n\nCheers, EcoRetain Success Team"
    },
    service_dissatisfaction: {
      title: 'Premium Service Guarantee',
      description:
        'Service quality issues detected. Offer a complimentary premium tier upgrade for 60 days and assign a dedicated account manager.',
      discount: '60-Day Premium Upgrade',
      badge: 'Service Recovery',
      color: '#B45309',
      colorBg: '#FEF3C7',
      icon: '⭐',
      action: 'Escalate to Premium',
      reductionPct: 48,
      retentionRate: 71,
      savingsNote: 'Premium escalation retains 71% of dissatisfied users',
      messageTemplate: "Subject: Improving your experience, [Name] 🛡️\n\nHi [Name],\n\nWe're sorry to hear about your recent service issues. To make it right, we've upgraded your account to Premium and assigned a dedicated manager. Enjoy 60 days of priority access on us.\n\nTalk soon, EcoRetain Support"
    },
    product_dissatisfaction: {
      title: 'Free Product Onboarding + Add-ons',
      description:
        'Product-fit issue detected. Trigger a personalised onboarding session and unlock premium add-on features at no cost for 30 days.',
      discount: '30-Day Add-on Trial',
      badge: 'Product Fit Offer',
      color: '#0369a1',
      colorBg: '#E0F2FE',
      icon: '🎯',
      action: 'Initiate Onboarding Call',
      reductionPct: 44,
      retentionRate: 66,
      savingsNote: 'Guided onboarding recovers 66% of product-fit churners',
    },
    support: {
      title: 'Priority Support + Credits',
      description:
        'Poor support experience cited. Offer dedicated priority support channel access and $20 account credits as an immediate gesture of goodwill.',
      discount: '$20 Account Credit',
      badge: 'Support Recovery',
      color: '#0f766e',
      colorBg: '#CCFBF1',
      icon: '🛡️',
      action: 'Activate Priority Lane',
      reductionPct: 52,
      retentionRate: 73,
      savingsNote: 'Priority lanes recover 73% of support-frustrated users',
    },
    network: {
      title: 'Network Reliability Guarantee',
      description:
        'Network complaints on record. Offer guaranteed SLA upgrade, proactive monitoring, and 1-month bill credit for documented downtime.',
      discount: '1-Month Bill Credit',
      badge: 'Reliability Offer',
      color: '#9f1239',
      colorBg: '#FFE4E6',
      icon: '📡',
      action: 'Issue SLA Upgrade',
      reductionPct: 40,
      retentionRate: 58,
      savingsNote: 'SLA guarantees retain 58% of network-issue churners',
    },
    moving: {
      title: 'Transfer & Stay Incentive',
      description:
        'Customer is relocating. Offer seamless service transfer assistance + a $15/mo rate lock for 6 months at their new location.',
      discount: '$15/mo Rate Lock — 6 Months',
      badge: 'Relocation Offer',
      color: '#4d7c0f',
      colorBg: '#ECFCCB',
      icon: '🏠',
      action: 'Initiate Transfer Request',
      reductionPct: 35,
      retentionRate: 52,
      savingsNote: 'Relocation transfers save 52% of moving customers',
    },
    no_reason: {
      title: 'General Retention Incentive',
      description:
        'No specific exit reason given. Send a personalised re-engagement email with a flexible 15% discount and a survey to identify pain points.',
      discount: '15% General Discount',
      badge: 'Re-Engagement',
      color: '#6B7280',
      colorBg: '#F3F4F6',
      icon: '🤝',
      action: 'Send Re-Engagement Offer',
      reductionPct: 28,
      retentionRate: 45,
      savingsNote: 'General re-engagement retains 45% of at-risk customers',
      messageTemplate: "Subject: Thinking of you, [Name] 👋\n\nHi [Name],\n\nIt's been a while! We've added some great new features we think you'll love. Here's a 15% discount code to help you jump back in: WELCOMEBACK15.\n\nBest, EcoRetain Team"
    },
  };

  return offerMap[reason] || offerMap['no_reason'];
};

/**
 * Computes the What-If simulation result.
 * @param {number} currentProb  - current churn probability (0–100)
 * @param {object} offer        - offer object from getOfferForReason()
 * @returns {{ before, after, reduction, newRisk, revenueSaved }}
 */
export const simulateOffer = (currentProb, offer, monthlySpend = 0) => {
  const reduction = Math.round(currentProb * (offer.reductionPct / 100));
  const after = Math.max(currentProb - reduction, 2); // never goes to 0
  const newRisk = after >= 60 ? 'High' : after >= 30 ? 'Medium' : 'Low';
  const annualRevenue = monthlySpend * 12;
  const revenueSaved = ((reduction / 100) * annualRevenue).toFixed(2);

  return {
    before: currentProb,
    after,
    reduction,
    newRisk,
    retentionRate: offer.retentionRate,
    revenueSaved,
    savingsNote: offer.savingsNote,
  };
};

/**
 * Infers a churn reason key from the raw churnReason string in data.json
 * (which comes from the telecom dataset's "Churn Reason" column).
 */
export const inferReasonKey = (rawReason = '') => {
  const r = rawReason.toLowerCase();
  if (r.includes('price') || r.includes('expensive') || r.includes('cost') || r.includes('charge')) return 'price';
  if (r.includes('competitor') || r.includes('compet')) return 'competitor';
  if (r.includes('support') || r.includes('attitude') || r.includes('staff')) return 'support';
  if (r.includes('network') || r.includes('reliability') || r.includes('coverage') || r.includes('download') || r.includes('internet') || r.includes('speed')) return 'network';
  if (r.includes('mov') || r.includes('reloc')) return 'moving';
  if (r.includes('product') || r.includes('feature') || r.includes('limited') || r.includes('missing')) return 'product_dissatisfaction';
  if (r.includes('dissatisfi') || r.includes('service') || r.includes('quality')) return 'service_dissatisfaction';
  return 'no_reason';
};
