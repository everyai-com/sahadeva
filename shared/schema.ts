import { z } from "zod";

export const birthInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezoneOffset: z.number().min(-14).max(14),
  timezone: z.string().trim().min(1).max(80).refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone:value }); return true; } catch { return false; } }, "Invalid IANA timezone").optional(),
  place: z.string().trim().min(1).max(120),
  language: z.enum(["en", "te"]).default("en"),
  methodology: z.enum(["parashari", "kp", "western", "comparative"]).default("parashari"),
  focus: z.enum(["general", "career", "marriage", "children", "education", "property", "health", "spirituality"]).default("general"),
  birthTimeAccuracyMinutes: z.number().min(0).max(1440).default(5),
  houseSystem: z.enum(["whole-sign","equal","sripati"]).optional(),
});

export type BirthInput = z.infer<typeof birthInputSchema>;

export type GrahaName = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu" | "Ketu" | "Lagna";
export type Placement = { name: GrahaName; longitude: number; tropicalLongitude?: number; eclipticLatitude?: number; sign: number; signName?: string; degree: number; nakshatra: string; pada: number; retrograde?: boolean };
export type ChartResult = {
  input: BirthInput;
  engine: { version: string; precision: "research-preview"; astronomyModel: string; validRange: string; ayanamsa: string; ayanamsaDegrees: number; zodiac: { type:"sidereal"; signIndexBase:0; signIndexRange:"0-11"; signNames:string[] }; ayanamsaConvention: { id:string;version:string;convention:string;source:string;precessionModel:string;nutationModel:string }; julianDay: number; timezone: { id: string | null; suppliedOffsetHours: number; resolvedOffsetHours: number; source: string }; validation: { planets: string; moon: string; ayanamsa: string; lagna: string; solarEvents:string; productionCertified: boolean }; notice: string };
  placements: Placement[];
  navamsa: Array<{ name: GrahaName; sign: number; signName?:string }>;
  panchanga: {
    vara: string; tithi: string; paksha: string; nakshatra: string; yoga: string; karana: string;
    events: {
      sunriseJulianDay: number | null;
      sunsetJulianDay: number | null;
      nextTithiJulianDay: number;
      nextNakshatraJulianDay: number;
      nextYogaJulianDay: number;
      nextKaranaJulianDay: number;
    };
  };
  vimshottari: { birthLord: string; balanceYears: number; sequence: Array<{ lord: string; years: number }> };
  advanced: {
    vargas: Record<string, Array<{ name: GrahaName; sign: number }>>;
    dignities: Array<{ name: GrahaName; sign: number; signLord: string; dignity: string; combust: boolean }>;
    aspects: Array<{ from: GrahaName; to: GrahaName; kind: string; separation: number }>;
    vimshottariTimeline: Array<{ lord: string; startJulianDay: number; endJulianDay: number; subPeriods: Array<{ lord: string; startJulianDay: number; endJulianDay: number; pratyantarPeriods: Array<{ lord: string; startJulianDay: number; endJulianDay: number }> }> }>;
    birthPeriods: { mahadasha: string | null; antardasha: string | null; pratyantardasha: string | null };
    uncertainty: { birthTimeMinutes: number; boundaryWarnings: string[] };
    guidance: {
      methodology: { selected: string; status: string; blendingAllowed: boolean };
      focus: { selected: string; label: string; relevantHouse: number; recommendedVarga: string; karakas: string[] };
      confidence: { score: number; level: string; factors: string[] };
      evidence: { lagnaSign: number; relevantHouseSign: number; relevantHouseLord: string; lordPlacementSign: number | null; lordHouseFromLagna: number | null; observation: string };
    };
    ashtakavarga: {
      convention: string;
      bhinna: Record<string, { signs: number[]; total: number; contributions: Record<string, number[]> }>;
      sarva: { signs: number[]; total: number };
      reductions: { status: string; order: string[]; occupancyConvention: string; bhinna: Record<string, { afterTrikona: number[]; afterEkadhipatya: number[]; total: number }>; notice: string };
      pinda: { status: string; rasiMultipliers: number[]; grahaMultipliers: Record<string, number>; values: Record<string, { rasiPinda: number; grahaPinda: number; yogaPinda: number }>; convention: string };
    };
    planetaryStates: {
      avasthas: Array<{
        name: string;
        balaadiAvastha: string;
        avasthaStrengthPercent: number;
        naisargikaBalaVirupas: number;
        uchchaBalaVirupas: number;
        digBalaVirupas: number;
        ojhayugmaBalaVirupas: number;
        kendradiBalaVirupas: number;
        drekkanaBalaVirupas: number;
        saptavargajaBalaVirupas: number;
        saptavargajaDetails: Array<{ varga: string; sign: number; lord: string; relationship: string; virupas: number }>;
        nathonnataBalaVirupas: number | null;
        pakshaBalaVirupas: number;
        tribhagaBalaVirupas: number | null;
        calendarLordBalaVirupas: number | null;
        declinationDegrees: number | null;
        ayanaBalaVirupas: number | null;
        cheshtaBalaVirupas: number | null;
        yuddhaBalaVirupas: number | null;
        shadbalaTotalVirupas: number | null;
        requiredVirupas: number;
        requiredStrengthRatio: number | null;
        drikBalaVirupas: number;
        drikContributions: Array<{ aspector: string; aspectVirupas: number; polarity: string; signedVirupas: number }>;
        retrograde: boolean;
      }>;
      relationships: Array<{ from: string; to: string; natural: string; temporary: string; compound: string; houseDistance: number }>;
      grahaYuddhaCandidates: Array<{ first: GrahaName; second: GrahaName; separationDegrees: number; winner:GrahaName|null;loser:GrahaName|null;transferVirupas:number;status: string }>;
      grahaYuddhaConvention:{id:string;version:string;eligibility:string;winner:string;transfer:string};
      shadbala: { status: string; computedComponents: string[]; unavailableComponents: string[]; conventionIds:string[]; notice: string };
      tribhaga: { status: string; period: string | null; third: number | null; lord: string | null; values: Record<string, number>; notice: string } | null;
      calendarBala: { convention: { id:string;version:string;year:string;month:string;day:string;hora:string }; yearIngressJulianDay:number;monthIngressJulianDay:number;governingSunriseJulianDay:number;horaIndex:number;lords:{year:string;month:string;day:string;hora:string};values:Record<string,number> } | null;
      cheshtaBala: { convention:{id:string;version:string;source:string;supportedPlanets:readonly string[]};values:Record<string,number>;details:Array<{name:string;meanLongitude:number;trueLongitude:number;sighroccaLongitude:number;midpointLongitude:number;cheshtaKendraDegrees:number;virupas:number}> } | null;
    };
    houses: {
      selectedSystem:"whole-sign"|"equal"|"sripati";
      wholeSign: { status: string; convention: string };
      equalBhava: { status: string; convention: string; boundaries: Array<{ house: number; midpointLongitude: number; startLongitude: number; endLongitude: number }>; planetHouses: Array<{ name: GrahaName; wholeSignHouse: number; equalBhavaHouse: number }> };
      sripati:{status:string;convention:string;midheaven:{tropicalLongitude:number;siderealLongitude:number}|null;madhyas:Array<{house:number;midpointLongitude:number}>;sandhis:Array<{house:number;startLongitude:number;endLongitude:number;widthDegrees:number}>;planetHouses:Array<{name:GrahaName;sripatiHouse:number}>;notice:string};
      bhavaBala:{status:string;houseSystem:string;values:unknown[];notice:string};
      arudhas: { status: string; exceptionRule: string; values: Array<{ house: number; houseSign: number; lord: GrahaName; lordSign: number; padaSign: number; label: string }> };
      temporalLagnas: { status: string; convention: string; elapsedGhatis: number | null; values: Array<{ name: string; longitude: number; rate: string; sign: number; degree: number }>; notice: string };
      targetedLagnas:{status:string;values:Array<{name:string;longitude:number;sign:number;degree:number;evidence:Record<string,string|number>}>;convention:string;notice:string};
    };
    yogas: Array<{ yoga: string; detected: boolean; evidence: string[]; sourceKey: string; status: "structural-only" }>;
  };
};
