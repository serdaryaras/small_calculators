/** BV NR467 — bilge / fire pump method aligned with 11-Pumps (Pt C Ch 1 Sec 10 · Pt D Ch 7 · Pt C Ch 4 Sec 6). */

export const COMMERCIAL_DN = [
  50, 65, 80, 100, 125, 150, 175, 200, 250, 300, 350, 400,
] as const;

export const BILGE_BRANCH_D_TERM = 25;
export const BILGE_BRANCH_D_COEFF = 2.16;
export const BILGE_BRANCH_MIN_MM = 50;

export const BILGE_MAIN_D_TERM = 25;
export const BILGE_MAIN_D_COEFF = 1.68;

export const TANKER_MAIN_D_TERM = 35;
export const TANKER_MAIN_D_COEFF = 3;

export const BILGE_MAIN_MIN_MM = 60;
export const BILGE_MAIN_FORMULA_SLACK_MM = 5;

export const BILGE_Q_COEFF_STANDARD = 0.00565;
export const BILGE_Q_COEFF_SHORT = 0.00345;
export const SHORT_SHIP_LENGTH_M = 35;

export const FIRE_TOTAL_CAP_CARGO_M3H = 180;
export const FIRE_PUMP_MIN_EACH_M3H = 25;
export const FIRE_PUMP_EACH_FRACTION = 0.8;
export const EMERGENCY_FIRE_FRACTION = 0.4;
export const EMERGENCY_FIRE_MIN_M3H = 25;
export const MONITOR_CAPACITY_M3H = 60;
export const MONITOR_BREADTH_THRESHOLD_M = 30;

export const PASSENGER_NUMERAL_K_COEFF = 0.056;
export const PASSENGER_NUMERAL_EXTRA_PUMP = 30;

export const VT1_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Passenger ≥ 4000 GT",
  2: "Passenger < 4000 GT",
  3: "Cargo ≥ 1000 GT",
  4: "Cargo < 1000 GT",
};

export const VT2_LABELS: Record<1 | 2 | 3, string> = {
  1: "Passenger vessel",
  2: "Cargo ship",
  3: "5 or more container tiers on/above weather deck",
};

export const BV_RULE_REF =
  "BV NR467 Pt C Ch 1 Sec 10 (bilge) · Pt D Ch 7 Sec 4 (tanker) · Pt C Ch 4 Sec 6 (fire)";
