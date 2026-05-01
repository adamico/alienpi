// Phase 1 economy MVP — Loan → Fight → Repair (see docs/plan.html).
export const economy = {
  bossClearBonus: 5000, // flat bonus for boss kill
  deathPenaltyRatio: 0.0, // forgiving by design (Phase 1)
  payoutRatio: 1.0, // score points → substrate
  repairCostPerHp: 200, // substrate cost per HP lost
  startingLoan: 5000, // initial debt (Gaia Advance)
};
