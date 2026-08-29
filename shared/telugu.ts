import type { ChartResult } from "./schema";

export const TELUGU_SIGNS = ["మేషం", "వృషభం", "మిథునం", "కర్కాటకం", "సింహం", "కన్య", "తుల", "వృశ్చికం", "ధనుస్సు", "మకరం", "కుంభం", "మీనం"];
export const TELUGU_NAKSHATRAS = ["అశ్విని", "భరణి", "కృత్తిక", "రోహిణి", "మృగశిర", "ఆరుద్ర", "పునర్వసు", "పుష్యమి", "ఆశ్లేష", "మఖ", "పూర్వ ఫల్గుణి", "ఉత్తర ఫల్గుణి", "హస్త", "చిత్త", "స్వాతి", "విశాఖ", "అనూరాధ", "జ్యేష్ఠ", "మూల", "పూర్వాషాఢ", "ఉత్తరాషాఢ", "శ్రవణం", "ధనిష్ఠ", "శతభిషం", "పూర్వాభాద్ర", "ఉత్తరాభాద్ర", "రేవతి"];
export const TELUGU_GRAHAS: Record<string, string> = { Sun: "సూర్యుడు", Moon: "చంద్రుడు", Mars: "కుజుడు", Mercury: "బుధుడు", Jupiter: "గురువు", Venus: "శుక్రుడు", Saturn: "శని", Rahu: "రాహువు", Ketu: "కేతువు", Lagna: "లగ్నం" };
export const TELUGU_VARAS:Record<string,string>={Sunday:"ఆదివారం",Monday:"సోమవారం",Tuesday:"మంగళవారం",Wednesday:"బుధవారం",Thursday:"గురువారం",Friday:"శుక్రవారం",Saturday:"శనివారం"};
export const TELUGU_TITHIS:Record<string,string>={Pratipada:"పాడ్యమి",Dwitiya:"విదియ",Tritiya:"తదియ",Chaturthi:"చవితి",Panchami:"పంచమి",Shashthi:"షష్ఠి",Saptami:"సప్తమి",Ashtami:"అష్టమి",Navami:"నవమి",Dashami:"దశమి",Ekadashi:"ఏకాదశి",Dwadashi:"ద్వాదశి",Trayodashi:"త్రయోదశి",Chaturdashi:"చతుర్దశి",Purnima:"పౌర్ణమి"};
export const TELUGU_PAKSHAS:Record<string,string>={Shukla:"శుక్ల పక్షం",Krishna:"కృష్ణ పక్షం"};
export const TELUGU_YOGAS:Record<string,string>={Vishkambha:"విష్కంభ",Priti:"ప్రీతి",Ayushman:"ఆయుష్మాన్",Saubhagya:"సౌభాగ్య",Shobhana:"శోభన",Atiganda:"అతిగండ",Sukarma:"సుకర్మ",Dhriti:"ధృతి",Shula:"శూల",Ganda:"గండ",Vriddhi:"వృద్ధి",Dhruva:"ధ్రువ",Vyaghata:"వ్యాఘాత",Harshana:"హర్షణ",Vajra:"వజ్ర",Siddhi:"సిద్ధి",Vyatipata:"వ్యతీపాత",Variyana:"వరీయాన్",Parigha:"పరిఘ",Shiva:"శివ",Siddha:"సిద్ధ",Sadhya:"సాధ్య",Shubha:"శుభ",Shukla:"శుక్ల",Brahma:"బ్రహ్మ",Indra:"ఇంద్ర",Vaidhriti:"వైధృతి"};
export const TELUGU_KARANAS:Record<string,string>={Kimstughna:"కింస్తుఘ్న",Bava:"బవ",Balava:"బాలవ",Kaulava:"కౌలవ",Taitila:"తైతిల",Garaja:"గరజ",Vanija:"వణిజ",Vishti:"విష్టి",Shakuni:"శకుని",Chatushpada:"చతుష్పాద",Naga:"నాగ"};

export function teluguChartSummary(chart: ChartResult) {
  return {
    language: "te",
    title: `${chart.input.name} జాతక చక్రం`,
    place: chart.input.place,
    placements: chart.placements.map((p) => ({ graha: TELUGU_GRAHAS[p.name], rashi: TELUGU_SIGNS[p.sign], degrees: Number(p.degree.toFixed(4)), nakshatra: TELUGU_NAKSHATRAS[Math.floor(p.longitude / (360 / 27))], pada: p.pada })),
    panchanga: { varam: TELUGU_VARAS[chart.panchanga.vara]||chart.panchanga.vara, tithi: TELUGU_TITHIS[chart.panchanga.tithi]||chart.panchanga.tithi, paksham: TELUGU_PAKSHAS[chart.panchanga.paksha]||chart.panchanga.paksha, nakshatram: TELUGU_NAKSHATRAS[Math.floor(chart.placements.find((p) => p.name === "Moon")!.longitude / (360 / 27))], yogam: TELUGU_YOGAS[chart.panchanga.yoga]||chart.panchanga.yoga, karanam: TELUGU_KARANAS[chart.panchanga.karana]||chart.panchanga.karana },
    disclaimer: "ఇది పరిశోధనా ప్రివ్యూ మాత్రమే. వృత్తిపరమైన జ్యోతిష్య నిర్ణయాలకు ఇంకా ధృవీకరించబడలేదు.",
  };
}
