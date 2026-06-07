/** BV NR467 Pt C, Ch 1, Sec 10 [6.8.1] — bilge main diameter constant term (mm). */
export const BILGE_MAIN_D_TERM = 25;

/** BV NR467 Pt C, Ch 1, Sec 10 [6.8.1] — bilge main diameter coefficient. */
export const BILGE_MAIN_D_COEFF = 1.68;

/** BV [6.7.4] — bilge pump capacity factor (L ≥ 35 m, 2 m/s). */
export const BILGE_Q_COEFF_STANDARD = 0.00565;

/** BV [6.7.4] Note 1 — short cargo ships (L < 35 m). */
export const BILGE_Q_COEFF_SHORT = 0.00345;

export const SHORT_SHIP_LENGTH_M = 35;

/** SOLAS II-2/10.2.4.1.2 — max total main fire pump capacity (cargo). */
export const FIRE_TOTAL_CAP_CARGO_M3H = 180;

/** IACS UI SC270 — emergency fire pump cap (container 5+ tiers). */
export const FIRE_EMERGENCY_CAP_CONTAINER_M3H = 72;

/** SOLAS II-2/10.2.4.2 — minimum capacity per required fire pump (m³/h). */
export const FIRE_PUMP_MIN_EACH_M3H = 25;

/** FSS Code Ch.12 — emergency fire pump absolute minimum (cargo GT ≥ 2000). */
export const EMERGENCY_FIRE_MIN_CARGO_LARGE_M3H = 25;

/** FSS Code Ch.12 — emergency fire pump absolute minimum (cargo GT < 2000). */
export const EMERGENCY_FIRE_MIN_CARGO_SMALL_M3H = 15;

/** FSS Code Ch.12 — emergency as fraction of total required fire capacity. */
export const EMERGENCY_FIRE_FRACTION = 0.4;

/** SOLAS II-2/10.2.4.2 — each required pump ≥ this fraction of total / n_min. */
export const FIRE_PUMP_EACH_FRACTION = 0.8;

/** SOLAS II-2/10.2.4.1.2 — cargo fire total vs passenger bilge pump (each). */
export const FIRE_CARGO_VS_PASSENGER_BILGE = 4 / 3;

/** SOLAS II-2/10.2.4.1.1 — passenger fire total vs bilge pumping total. */
export const FIRE_PASSENGER_VS_BILGE = 2 / 3;

export const BV_RULE_REF = "BV NR467 Pt C, Ch 1 Sec 10 (bilge) · Ch 4 Sec 6 (fire, SOLAS II-2)";
