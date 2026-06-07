import type {
  WastewaterResult,
  WastewaterShipType,
  WastewaterStream,
  WastewaterStreamResult,
  WastewaterTankResult,
} from "./types";

/** L/person/day — (black, gray, laundry, galley) per ship type. */
const NO_VACUUM: Record<WastewaterShipType, readonly [number, number, number, number]> = {
  1: [100, 160, 80, 90],
  2: [100, 150, 20, 30],
  3: [100, 50, 20, 30],
  4: [100, 100, 40, 60],
};

const VACUUM: Record<WastewaterShipType, readonly [number, number, number, number]> = {
  1: [12, 160, 80, 90],
  2: [12, 150, 20, 30],
  3: [12, 50, 20, 30],
  4: [12, 100, 40, 60],
};

export const WASTEWATER_SHIP_TYPES: { value: WastewaterShipType; label: string }[] = [
  { value: 1, label: "Cruise ship" },
  { value: 2, label: "Night Ro-Pax" },
  { value: 3, label: "Day Ro-Pax" },
  { value: 4, label: "Cargo ship" },
];

export const WASTEWATER_STREAM_ORDER: WastewaterStream[] = [
  "black",
  "gray",
  "laundry",
  "galley",
];

export const WASTEWATER_STREAM_LABELS: Record<WastewaterStream, string> = {
  black: "Black water",
  gray: "Gray water",
  laundry: "Laundry",
  galley: "Galley",
};

/** Streams routed to the combined gray-water holding tank. */
export const GRAY_TANK_STREAMS: WastewaterStream[] = ["gray", "laundry", "galley"];

const LITERS_PER_M3 = 1000;

function sumStreams(streams: WastewaterStreamResult[], pick: (s: WastewaterStreamResult) => number) {
  return streams.reduce((total, stream) => total + pick(stream), 0);
}

function buildWastewaterTanks(streams: WastewaterStreamResult[]): WastewaterTankResult[] {
  const black = streams.find((s) => s.stream === "black")!;
  const grayComponents = streams.filter((s) => GRAY_TANK_STREAMS.includes(s.stream));

  return [
    {
      id: "black",
      label: "Black water",
      rateLPerPersonDay: black.rateLPerPersonDay,
      dailyLiters: black.dailyLiters,
      dailyM3: black.dailyM3,
      holdingLiters: black.holdingLiters,
      holdingM3: black.holdingM3,
      components: [black],
    },
    {
      id: "gray",
      label: "Gray water",
      rateLPerPersonDay: sumStreams(grayComponents, (s) => s.rateLPerPersonDay),
      dailyLiters: sumStreams(grayComponents, (s) => s.dailyLiters),
      dailyM3: sumStreams(grayComponents, (s) => s.dailyM3),
      holdingLiters: sumStreams(grayComponents, (s) => s.holdingLiters),
      holdingM3: sumStreams(grayComponents, (s) => s.holdingM3),
      components: grayComponents,
    },
  ];
}

export function wastewaterRatesLPerPersonDay(
  shipType: WastewaterShipType,
  vacuumToilet: boolean,
): Record<WastewaterStream, number> {
  const table = vacuumToilet ? VACUUM : NO_VACUUM;
  const [b, g, l, ga] = table[shipType];
  return { black: b, gray: g, laundry: l, galley: ga };
}

export function wastewaterTankRateDescription(
  tank: WastewaterTankResult,
  personsOnBoard: number,
): string {
  if (tank.id === "black") {
    return `${tank.rateLPerPersonDay} L/person/day × ${personsOnBoard} persons`;
  }
  const parts = tank.components
    .map((c) => `${c.label} ${c.rateLPerPersonDay}`)
    .join(" + ");
  return `${parts} L/person/day × ${personsOnBoard} persons`;
}

export function computeWastewater(
  shipType: WastewaterShipType,
  vacuumToilet: boolean,
  personsOnBoard: number,
  nonDischargeDays: number,
): WastewaterResult {
  const rates = wastewaterRatesLPerPersonDay(shipType, vacuumToilet);

  const streams = WASTEWATER_STREAM_ORDER.map((stream) => {
    const rateLPerPersonDay = rates[stream];
    const dailyLiters = rateLPerPersonDay * personsOnBoard;
    const holdingLiters = dailyLiters * nonDischargeDays;
    return {
      stream,
      label: WASTEWATER_STREAM_LABELS[stream],
      rateLPerPersonDay,
      dailyLiters,
      dailyM3: dailyLiters / LITERS_PER_M3,
      holdingLiters,
      holdingM3: holdingLiters / LITERS_PER_M3,
    };
  });

  const tanks = buildWastewaterTanks(streams);
  const blackTank = tanks.find((t) => t.id === "black")!;
  const grayTank = tanks.find((t) => t.id === "gray")!;

  const totalDailyLiters = streams.reduce((s, x) => s + x.dailyLiters, 0);
  const totalHoldingLiters = tanks.reduce((s, t) => s + t.holdingLiters, 0);

  return {
    shipType,
    vacuumToilet,
    personsOnBoard,
    streams,
    tanks,
    totalDailyLiters,
    totalDailyM3: totalDailyLiters / LITERS_PER_M3,
    totalHoldingLiters,
    totalHoldingM3: totalHoldingLiters / LITERS_PER_M3,
    blackWaterDailyM3: blackTank.dailyM3,
    grayWaterTotalDailyM3: grayTank.dailyM3,
    grayWaterTotalHoldingM3: grayTank.holdingM3,
    blackWaterHoldingM3: blackTank.holdingM3,
  };
}
