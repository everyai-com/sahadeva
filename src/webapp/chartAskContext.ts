export type ChartAskContext = {
  division: "d1" | "d9" | "d10" | "d7" | "d12";
  house: number;
  sign: string;
  planets: string[];
};

const STORAGE_KEY = "sahadeva.chartAskContext.v1";

export function saveChartAskContext(context: ChartAskContext) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Navigation still works when storage is unavailable.
  }
}

export function takeChartAskContext(): ChartAskContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ChartAskContext>;
    if (
      (value.division === "d1" ||
        value.division === "d9" ||
        value.division === "d10" ||
        value.division === "d7" ||
        value.division === "d12") &&
      Number.isInteger(value.house) &&
      Number(value.house) >= 1 &&
      Number(value.house) <= 12 &&
      typeof value.sign === "string" &&
      Array.isArray(value.planets)
    ) {
      return value as ChartAskContext;
    }
  } catch {
    // Ignore malformed or unavailable session storage.
  }
  return null;
}

export function chartAskContextText(context: ChartAskContext): string {
  const division =
    context.division === "d9"
      ? "Navamsa (D-9)"
      : context.division === "d10"
        ? "Dasamsa (D-10)"
        : context.division === "d7"
          ? "Saptamsa (D-7)"
          : context.division === "d12"
            ? "Dwadasamsa (D-12)"
            : "Rasi (D-1)";
  const occupants = context.planets.length ? context.planets.join(", ") : "no occupying planets";
  return `The user selected House ${context.house} in the ${division} chart: ${context.sign}, with ${occupants}. Interpret their question specifically in this selected chart context.`;
}
