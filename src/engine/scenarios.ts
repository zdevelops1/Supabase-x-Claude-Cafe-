import type { Scenario } from './types';

/**
 * 12 scenarios: 4 days × 3 slots. Both cafés face the same scenario each round.
 * Each option has real tradeoffs — its value depends on your café's state AND
 * what the rival café does in the same shared market.
 */
export const SCENARIOS: Scenario[] = [
  // ───────────────────────── DAY 1 · OPENING DAY ─────────────────────────
  {
    id: 'grand_opening',
    day: 1,
    slot: 'Morning',
    title: 'Grand Opening',
    icon: '🎉',
    description:
      'Both cafés open their doors on the same block today. Curious locals are deciding which spot becomes their new daily habit.',
    demand: 1.0,
    actions: [
      { id: 'free_samples', key: 'A', label: 'Free tasting samples', description: 'Hand out free samples on the sidewalk. $150 + 40 units of inventory, big buzz.', effect: { cost: 150, inventory: -40, buzz: 12 } },
      { id: 'opening_discount', key: 'B', label: '20% opening discount', description: '20% off everything today. Pulls in crowds, thinner margins.', effect: { promo: 0.2 } },
      { id: 'hire_barista', key: 'C', label: 'Hire a permanent barista', description: '+1 staff for the rest of the game (+25 capacity per round, $80 wages per round).', effect: { staffPerm: 1 } },
      { id: 'premium_beans', key: 'D', label: 'Premium bean supplier', description: 'Switch to specialty beans: +12 quality forever, but ingredients cost 15% more. $100 setup.', effect: { cost: 100, quality: 12, unitCostMult: 1.15 } },
    ],
  },
  {
    id: 'lunch_lull',
    day: 1,
    slot: 'Afternoon',
    title: 'Lunch Lull',
    icon: '🥪',
    description: 'Office workers grabbed lunch elsewhere. Foot traffic is down 30% this afternoon.',
    demand: 0.7,
    actions: [
      { id: 'send_staff_home', key: 'A', label: 'Send a barista home', description: '-1 staff this round only. Saves $80 in wages, less capacity.', effect: { staffTemp: -1 } },
      { id: 'lunch_combo', key: 'B', label: 'Lunch combo deal', description: '15% off sandwich + drink combos. Attracts the few people out.', effect: { promo: 0.15, buzz: 4 } },
      { id: 'social_ad', key: 'C', label: 'Run a social media ad', description: '$250 targeted ad: brings new people into the neighborhood and toward you.', effect: { cost: 250, buzz: 8, demandMult: 1.2 } },
      { id: 'deep_clean', key: 'D', label: 'Deep clean & reset', description: 'Use the quiet time: $120 of supplies. +6 satisfaction, +2 reputation.', effect: { cost: 120, sat: 6, rep: 2 } },
    ],
  },
  {
    id: 'study_crowd',
    day: 1,
    slot: 'Evening',
    title: 'Evening Study Crowd',
    icon: '📚',
    description: 'Finals week at the nearby college. Students want late hours and cheap caffeine — and they are price-sensitive.',
    demand: 1.15,
    actions: [
      { id: 'raise_prices_10', key: 'A', label: 'Raise prices 10%', description: 'Permanent 10% price increase. More per cup, less appealing to bargain hunters.', effect: { priceMult: 1.1 } },
      { id: 'student_discount', key: 'B', label: '15% student discount', description: '15% off tonight only. Wins the price-sensitive crowd.', effect: { promo: 0.15, sat: 2 } },
      { id: 'extend_hours', key: 'C', label: 'Stay open late', description: '+1 temp staff ($110) and longer hours reach more students (+20% reach).', effect: { staffTemp: 1, demandMult: 1.2 } },
      { id: 'pastry_case', key: 'D', label: 'Install a pastry case', description: '$350 one-time. +5 quality and a permanent +5% higher average ticket.', effect: { cost: 350, quality: 5, priceMult: 1.05 } },
    ],
  },

  // ───────────────────────── DAY 2 · THE RUSH ─────────────────────────
  {
    id: 'tech_conference',
    day: 2,
    slot: 'Morning',
    title: 'Morning Rush',
    icon: '💻',
    description: 'A nearby tech conference just let out. A huge wave of caffeine-hungry developers floods the neighborhood (+60% demand).',
    demand: 1.6,
    actions: [
      { id: 'surge_price_15', key: 'A', label: 'Raise prices 15% (today)', description: 'Surge pricing this round only. More per cup, but pushes some customers across the street.', effect: { priceRound: 1.15 } },
      { id: 'hire_temp_staff', key: 'B', label: 'Hire 2 temporary staff', description: '+2 temp staff this round ($220). +50 capacity so fewer people walk out.', effect: { staffTemp: 2 } },
      { id: 'bogo_promo', key: 'C', label: 'Launch a BOGO promotion', description: 'Buy-one-get-one: ~30% effective discount. Massive pull and goodwill, very thin margin.', effect: { promo: 0.3, buzz: 10, rep: 3 } },
      { id: 'keep_steady_rush', key: 'D', label: 'Keep operations unchanged', description: 'No cost, no changes. Ride the wave as-is.', effect: {} },
    ],
  },
  {
    id: 'supply_shortage',
    day: 2,
    slot: 'Afternoon',
    title: 'Milk Shortage',
    icon: '🥛',
    description: 'A dairy distributor failed. Both cafés lose 140 units of inventory unless they find another way.',
    demand: 1.0,
    baseline: { inventory: -140 },
    actions: [
      { id: 'emergency_supplier', key: 'A', label: 'Pay emergency supplier', description: '$480 rush order replaces the lost 140 units. Expensive but no disruption.', effect: { cost: 480, inventory: 140 } },
      { id: 'oat_milk_upcharge', key: 'B', label: 'Switch to oat milk (+10%)', description: '$180 buys 70 units of oat milk. Charge 10% more this round; some regulars like it.', effect: { cost: 180, inventory: 70, priceRound: 1.1, sat: 2 } },
      { id: 'limited_menu', key: 'C', label: 'Limited black-coffee menu', description: 'No cost. Black coffee uses less stock (+60 units of headroom) but customers are less happy.', effect: { inventory: 60, sat: -7, quality: -2 } },
      { id: 'close_early', key: 'D', label: 'Close early', description: 'Send one barista home and serve 35% fewer people. Saves stock for tonight.', effect: { staffTemp: -1, demandMult: 0.65 } },
    ],
  },
  {
    id: 'influencer_visit',
    day: 2,
    slot: 'Evening',
    title: 'Food Influencer in Town',
    icon: '📸',
    description: 'A popular local food influencer (180k followers) is reviewing cafés on this street tonight.',
    demand: 1.05,
    actions: [
      { id: 'vip_treatment', key: 'A', label: 'Comp their order + VIP', description: '$100 of comped drinks and personal service. +4 reputation, some buzz.', effect: { cost: 100, rep: 4, buzz: 6 } },
      { id: 'latte_art_show', key: 'B', label: 'Latte-art showcase', description: '$200 + 1 temp barista ($110). +4 quality permanently from the training.', effect: { cost: 200, staffTemp: 1, quality: 4 } },
      { id: 'sponsored_post', key: 'C', label: 'Pay for a sponsored post', description: '$400 paid feature. Big reach (+25%) and buzz tonight.', effect: { cost: 400, buzz: 18, demandMult: 1.25 } },
      { id: 'ignore_influencer', key: 'D', label: 'Treat them like anyone', description: 'No cost. Authenticity — but no special push.', effect: {} },
    ],
  },

  // ───────────────────────── DAY 3 · TROUBLE ─────────────────────────
  {
    id: 'machine_breaks',
    day: 3,
    slot: 'Morning',
    title: 'Espresso Machine Breaks',
    icon: '🔧',
    description: 'A heat wave fried the espresso machines on the block. Both cafés are running at ~55% capacity unless they act.',
    demand: 1.1,
    baseline: { capacityMult: 0.55 },
    actions: [
      { id: 'emergency_repair', key: 'A', label: 'Emergency repair', description: '$520 technician today. Back to full capacity immediately.', effect: { cost: 520, capacityMult: 1.82 } },
      { id: 'rent_backup', key: 'B', label: 'Rent a backup machine', description: '$220 rental gets you to ~80% capacity.', effect: { cost: 220, capacityMult: 1.45 } },
      { id: 'drip_only', key: 'C', label: 'Drip & cold brew only', description: 'No cost. Faster drinks (~70% capacity) but 10% cheaper menu and less happy customers.', effect: { capacityMult: 1.27, priceRound: 0.9, sat: -4 } },
      { id: 'push_through', key: 'D', label: 'Push through it', description: 'No cost. Serve whoever you can at 55% capacity.', effect: {} },
    ],
  },
  {
    id: 'rainy_day',
    day: 3,
    slot: 'Afternoon',
    title: 'Rainy Afternoon',
    icon: '🌧️',
    description: 'A storm rolls in. Walk-in traffic drops 25%, but people still want warm drinks.',
    demand: 0.75,
    actions: [
      { id: 'delivery_partner', key: 'A', label: 'Partner with a delivery app', description: '$150 setup. +35% reach this round, but the app takes ~10% of each order.', effect: { cost: 150, demandMult: 1.35, priceRound: 0.9 } },
      { id: 'cozy_special', key: 'B', label: 'Cozy rainy-day special', description: '10% off hot drinks today. +6 satisfaction from the vibe.', effect: { promo: 0.1, sat: 6 } },
      { id: 'skeleton_crew', key: 'C', label: 'Skeleton crew', description: '-1 staff this round. Save wages on a slow day.', effect: { staffTemp: -1 } },
      { id: 'soup_menu', key: 'D', label: 'Add a hot soup menu', description: '$300 one-time. +4 quality permanently and +15% reach today.', effect: { cost: 300, quality: 4, demandMult: 1.15 } },
    ],
  },
  {
    id: 'price_war',
    day: 3,
    slot: 'Evening',
    title: 'Price War Brewing',
    icon: '⚔️',
    description: 'Word on the street: the café across the street is planning to undercut you. Time to make a strategic move.',
    demand: 1.0,
    actions: [
      { id: 'cut_prices_10', key: 'A', label: 'Cut prices 10% permanently', description: 'Lower prices for the rest of the game. Wins share, lowers margin per cup.', effect: { priceMult: 0.9 } },
      { id: 'expand_seating', key: 'B', label: 'Expand seating + hire', description: '$600 build-out. +1 permanent staff and +6 permanent appeal.', effect: { cost: 600, staffPerm: 1, appeal: 6 } },
      { id: 'loyalty_program', key: 'C', label: 'Launch a loyalty card', description: '$300. +4 permanent appeal and +4 satisfaction.', effect: { cost: 300, appeal: 4, sat: 4 } },
      { id: 'hold_steady', key: 'D', label: 'Hold steady', description: 'No cost. Trust your current position.', effect: {} },
    ],
  },

  // ───────────────────────── DAY 4 · FINALE ─────────────────────────
  {
    id: 'health_inspector',
    day: 4,
    slot: 'Morning',
    title: 'Surprise Health Inspection',
    icon: '📋',
    description: 'A health inspector is visiting every café on the block. Unprepared cafés will lose 6 reputation from a mediocre grade.',
    demand: 1.0,
    baseline: { rep: -6 },
    actions: [
      { id: 'overtime_clean', key: 'A', label: 'Overnight deep clean', description: '$300 overtime crew. Aces the inspection (+9 rep, cancels the penalty and then some).', effect: { cost: 300, rep: 9, sat: 3 } },
      { id: 'quick_tidy', key: 'B', label: 'Quick tidy-up', description: '$80. Softens the hit (+4 rep against the -6 penalty).', effect: { cost: 80, rep: 4 } },
      { id: 'hire_consultant', key: 'C', label: 'Hire a food-safety consultant', description: '$650. Gold-star grade (+12 rep) and +3 quality from process fixes.', effect: { cost: 650, rep: 12, quality: 3 } },
      { id: 'wing_it', key: 'D', label: 'Wing it', description: 'No cost. Take the -6 reputation hit.', effect: {} },
    ],
  },
  {
    id: 'farmers_market',
    day: 4,
    slot: 'Afternoon',
    title: 'Weekend Farmers Market',
    icon: '🧺',
    description: 'The weekend farmers market sets up right on your block. Demand is up 40%.',
    demand: 1.4,
    actions: [
      { id: 'popup_stall', key: 'A', label: 'Set up a pop-up stall', description: '$200 stall + 1 temp barista ($110). +30% reach.', effect: { cost: 200, staffTemp: 1, demandMult: 1.3 } },
      { id: 'weekend_pricing', key: 'B', label: 'Raise prices 10% (permanent)', description: 'Lock in higher prices for the rest of the game.', effect: { priceMult: 1.1 } },
      { id: 'bakery_partner', key: 'C', label: 'Partner with a local bakery', description: '$200. +6 quality permanently and some buzz.', effect: { cost: 200, quality: 6, buzz: 6 } },
      { id: 'steady_market', key: 'D', label: 'Keep operations unchanged', description: 'No cost. Serve the extra crowd with what you have.', effect: {} },
    ],
  },
  {
    id: 'closing_night',
    day: 4,
    slot: 'Evening',
    title: 'Closing Night Showdown',
    icon: '🏆',
    description: 'Final round. The whole neighborhood is out. This is the last chance to grab cash, reputation, and goodwill.',
    demand: 1.25,
    actions: [
      { id: 'host_gala', key: 'A', label: 'Host a live-music gala', description: '$300 event. +6 reputation, big buzz, +25% reach.', effect: { cost: 300, rep: 6, buzz: 14, demandMult: 1.25 } },
      { id: 'appreciation_day', key: 'B', label: 'Customer appreciation day', description: '25% off everything. +5 reputation, +8 satisfaction.', effect: { promo: 0.25, rep: 5, sat: 8 } },
      { id: 'max_margin', key: 'C', label: 'Maximize margin', description: '+25% prices tonight only. Cash grab — customers will notice.', effect: { priceRound: 1.25, sat: -6, rep: -2 } },
      { id: 'steady_finale', key: 'D', label: 'Business as usual', description: 'No cost. Finish strong with what you have.', effect: {} },
    ],
  },
];

export const TOTAL_ROUNDS = SCENARIOS.length;
export const TOTAL_DAYS = 4;
