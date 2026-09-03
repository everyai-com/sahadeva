// Classical remedy knowledge base — the full repertoire a practising Jyotishi
// draws on: beej and Vedic mantras, gemstones with traditional wearing
// guidance, upratna (substitute) stones, rudraksha, daana (charity), vrata
// (observance), deity stotras, colours, metals and Lal Kitab behavioural
// remedies, per graha, plus dosha-specific remedies. Content is traditional and
// widely published. Wearing/quantity/quality details are given as the tradition
// gives them, always paired with the practical caution a good astrologer adds
// (test the stone, consult a gemologist for weight, keep costs sane). Nothing
// here is a guaranteed outcome, a medical/financial/legal instruction, or a
// claim that a deity is angry — those framings are never used.

// Classical works these remedies are traditionally attributed to. This is an
// attribution list for transparency, NOT a claim of independent review — remedy
// rules still pass through the same reviewed-rule pipeline before they can be
// presented as verified citations.
export const REMEDY_SOURCES = {
  reviewStatus: "traditional-attribution-unreviewed",
  works: [
    { work: "Vedic Remedies in Astrology", author: "Sanjay Rath" },
    {
      work: "Brihat Parashara Hora Shastra",
      author: "Maharishi Parashara (attrib.)",
    },
    { work: "Lal Kitab", author: "Pt. Roop Chand Joshi (attrib.)" },
    { work: "Mantra Mahodadhi", author: "Mahidhara" },
    {
      work: "Widely-transmitted Graha Shanti tradition",
      author: "oral/regional",
    },
  ],
  note: "Beej mantras, gemstone correspondences, daana items and weekday/deity associations are standard across these traditions. Specific mantra text, gemstone weight and ritual procedure require qualified guidance.",
} as const;

export type PlanetName =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Rahu"
  | "Ketu";

export interface GemstoneGuidance {
  primary: string; // e.g. "Ruby (Manikya)"
  substitutes: string[]; // affordable upratna alternatives
  metal: string;
  finger: string;
  day: string;
  wearingNote: string; // traditional practice + practical caution (not fear)
}

export interface PlanetRemedy {
  planet: PlanetName;
  sanskritName: string;
  deity: string;
  weekday: string;
  color: string;
  direction: string;
  metal: string;
  bodyAndLife: string; // what this graha signifies, for the reader
  beejMantra: string;
  beejCount: number; // traditional japa count for a full anushthana
  vedicMantra: string;
  stotra: string; // recommended hymn/text (widely available)
  gemstone: GemstoneGuidance;
  rudraksha: string;
  daana: { items: string[]; day: string; recipient: string };
  vrata: { day: string; method: string };
  conduct: string; // behavioural remedy (safest, always applicable)
  lalKitab: string; // simple behavioural Lal Kitab remedy
  yantra: string;
}

export const PLANET_REMEDIES: Record<PlanetName, PlanetRemedy> = {
  Sun: {
    planet: "Sun",
    sanskritName: "Surya",
    deity: "Surya / Shiva",
    weekday: "Sunday",
    color: "red, orange",
    direction: "east",
    metal: "gold, copper",
    bodyAndLife:
      "vitality, confidence, authority, father, bones, heart, eyes and public standing",
    beejMantra: "Om Hraam Hreem Hraum Sah Suryaya Namah",
    beejCount: 7000,
    vedicMantra:
      "Om Aadityaaya Vidmahe Divaakaraaya Dheemahi Tanno Suryah Prachodayaat (Surya Gayatri)",
    stotra: "Aditya Hridayam",
    gemstone: {
      primary: "Ruby (Manikya)",
      substitutes: ["red garnet", "red spinel", "sunstone"],
      metal: "gold or copper",
      finger: "ring finger",
      day: "Sunday morning at sunrise",
      wearingNote:
        "Traditionally energised on a Sunday. Consult a qualified astrologer for suitability (the Sun should be a functional benefic for your ascendant) and a gemologist for weight and quality; a substitute stone is fine if a ruby is costly.",
    },
    rudraksha: "1-mukhi or 12-mukhi",
    daana: {
      items: ["wheat", "jaggery", "copper", "red cloth", "ruby"],
      day: "Sunday",
      recipient: "given respectfully to someone genuinely in need",
    },
    vrata: {
      day: "Sunday",
      method:
        "a light, optional observance — one simple meal, offering water to the rising Sun (Arghya), and avoiding salt if it suits you and your health",
    },
    conduct:
      "Act with steady integrity, honour your father and people in rightful authority, and start the day early with a clear intention.",
    lalKitab:
      "Offer water to the Sun at sunrise; keep your conduct honest and avoid arrogance toward elders.",
    yantra: "Surya Yantra",
  },
  Moon: {
    planet: "Moon",
    sanskritName: "Chandra",
    deity: "Parvati (Gauri) / Shiva",
    weekday: "Monday",
    color: "white, silver",
    direction: "northwest",
    metal: "silver",
    bodyAndLife:
      "mind, emotions, mother, nourishment, fluids, comfort and the sense of security",
    beejMantra: "Om Shraam Shreem Shraum Sah Chandraya Namah",
    beejCount: 11000,
    vedicMantra:
      "Om Padmadvajaaya Vidmahe Hema Roopaaya Dheemahi Tanno Chandrah Prachodayaat (Chandra Gayatri)",
    stotra: "Chandra Kavacham / Annapurna Stotram",
    gemstone: {
      primary: "Pearl (Moti)",
      substitutes: ["moonstone", "white coral"],
      metal: "silver",
      finger: "little finger",
      day: "Monday evening",
      wearingNote:
        "A gentle, low-risk stone. Natural pearl or moonstone is preferred; consult an astrologer for suitability and keep it clean.",
    },
    rudraksha: "2-mukhi",
    daana: {
      items: ["rice", "milk", "silver", "white cloth", "white flowers"],
      day: "Monday",
      recipient: "elderly women or a mother in need",
    },
    vrata: {
      day: "Monday",
      method:
        "an optional light fast until evening, kept only if your health allows",
    },
    conduct:
      "Care for your mother and elder women, keep your home and water clean, and hold to calming routines when emotions run high.",
    lalKitab:
      "Keep a silver item with you, offer milk to a sacred place or plant, and nurture your mother's wellbeing.",
    yantra: "Chandra Yantra",
  },
  Mars: {
    planet: "Mars",
    sanskritName: "Mangala",
    deity: "Hanuman / Kartikeya (Subramanya)",
    weekday: "Tuesday",
    color: "red",
    direction: "south",
    metal: "copper, gold",
    bodyAndLife:
      "energy, courage, drive, siblings, land, muscles, blood and the capacity to act",
    beejMantra: "Om Kraam Kreem Kraum Sah Bhaumaya Namah",
    beejCount: 10000,
    vedicMantra:
      "Om Angaarakaaya Vidmahe Shaktihastaaya Dheemahi Tanno Bhaumah Prachodayaat (Mangala Gayatri)",
    stotra: "Hanuman Chalisa / Mangala Stotram",
    gemstone: {
      primary: "Red Coral (Moonga)",
      substitutes: ["carnelian", "red jasper"],
      metal: "copper or gold",
      finger: "ring finger",
      day: "Tuesday morning",
      wearingNote:
        "Recommended only when Mars is a functional benefic for you; consult an astrologer first, since strengthening a badly-placed Mars can raise conflict. A gemologist should confirm weight and quality.",
    },
    rudraksha: "3-mukhi",
    daana: {
      items: ["red masoor dal", "copper", "red cloth", "jaggery"],
      day: "Tuesday",
      recipient: "given to those who protect or serve others",
    },
    vrata: {
      day: "Tuesday",
      method: "an optional observance with Hanuman worship and simple food",
    },
    conduct:
      "Channel restless energy into disciplined effort or exercise, practise patience, and step back from reckless anger and needless conflict.",
    lalKitab:
      "Offer sweets at a Hanuman temple, keep a sweet taste in your conduct, and avoid picking fights.",
    yantra: "Mangala Yantra",
  },
  Mercury: {
    planet: "Mercury",
    sanskritName: "Budha",
    deity: "Vishnu / Ganesha",
    weekday: "Wednesday",
    color: "green",
    direction: "north",
    metal: "bronze, gold",
    bodyAndLife:
      "intellect, speech, learning, commerce, nerves, skin and adaptability",
    beejMantra: "Om Braam Breem Braum Sah Budhaya Namah",
    beejCount: 9000,
    vedicMantra:
      "Om Gajadhvajaaya Vidmahe Sukhahastaaya Dheemahi Tanno Budhah Prachodayaat (Budha Gayatri)",
    stotra: "Vishnu Sahasranama / Budha Stotram",
    gemstone: {
      primary: "Emerald (Panna)",
      substitutes: ["green tourmaline", "peridot", "green onyx"],
      metal: "gold",
      finger: "little finger",
      day: "Wednesday morning",
      wearingNote:
        "Suitable when Mercury supports your ascendant; a natural, untreated emerald is ideal but a substitute is perfectly acceptable on a budget. Confirm suitability with an astrologer.",
    },
    rudraksha: "4-mukhi",
    daana: {
      items: ["green moong dal", "green cloth", "bronze", "books"],
      day: "Wednesday",
      recipient: "students or those pursuing education",
    },
    vrata: {
      day: "Wednesday",
      method: "an optional light observance with study or teaching as service",
    },
    conduct:
      "Speak honestly and plainly, keep your promises, keep learning, and help students or anyone trying to study.",
    lalKitab:
      "Give green fodder to a cow, donate books, and keep your speech truthful and clear.",
    yantra: "Budha Yantra",
  },
  Jupiter: {
    planet: "Jupiter",
    sanskritName: "Brihaspati (Guru)",
    deity: "Brihaspati / Dakshinamurthy / Vishnu",
    weekday: "Thursday",
    color: "yellow",
    direction: "northeast",
    metal: "gold",
    bodyAndLife:
      "wisdom, growth, children, teachers, fortune, liver and good judgment",
    beejMantra: "Om Graam Greem Graum Sah Gurave Namah",
    beejCount: 19000,
    vedicMantra:
      "Om Vrishabhadhvajaaya Vidmahe Krunihastaaya Dheemahi Tanno Guruh Prachodayaat (Guru Gayatri)",
    stotra: "Guru Stotram / Vishnu Sahasranama",
    gemstone: {
      primary: "Yellow Sapphire (Pukhraj)",
      substitutes: ["yellow topaz", "citrine"],
      metal: "gold",
      finger: "index finger",
      day: "Thursday morning",
      wearingNote:
        "Generally benefic and among the safer strengthening stones for most ascendants, but still confirm suitability with an astrologer and quality with a gemologist.",
    },
    rudraksha: "5-mukhi",
    daana: {
      items: ["turmeric", "chana dal", "gold", "yellow cloth", "banana"],
      day: "Thursday",
      recipient: "teachers, priests, or a place of learning",
    },
    vrata: {
      day: "Thursday",
      method:
        "an optional yellow-food observance; many keep it for wisdom and children's wellbeing",
    },
    conduct:
      "Respect teachers and elders, share what you know generously, and let ethics guide your choices before advantage does.",
    lalKitab:
      "Apply a saffron or turmeric tilak, respect your teachers and gurus, and support education.",
    yantra: "Guru Yantra",
  },
  Venus: {
    planet: "Venus",
    sanskritName: "Shukra",
    deity: "Lakshmi / Shukra",
    weekday: "Friday",
    color: "white, pastel",
    direction: "southeast",
    metal: "silver, platinum",
    bodyAndLife:
      "love, relationships, comforts, art, beauty, reproductive health and refinement",
    beejMantra: "Om Draam Dreem Draum Sah Shukraya Namah",
    beejCount: 16000,
    vedicMantra:
      "Om Ashwadhvajaaya Vidmahe Dhanurhastaaya Dheemahi Tanno Shukrah Prachodayaat (Shukra Gayatri)",
    stotra: "Sri Suktam / Shukra Stotram",
    gemstone: {
      primary: "Diamond (Heera)",
      substitutes: ["white sapphire", "white zircon", "opal"],
      metal: "silver, platinum or white gold",
      finger: "middle or ring finger",
      day: "Friday morning",
      wearingNote:
        "A diamond is costly; white sapphire or white zircon are fully accepted substitutes. Wear only if Venus suits your ascendant — confirm with an astrologer.",
    },
    rudraksha: "6-mukhi",
    daana: {
      items: ["white sweets", "sugar", "curd", "silver", "white cloth"],
      day: "Friday",
      recipient: "given with respect, often to women in need",
    },
    vrata: {
      day: "Friday",
      method: "an optional Lakshmi observance with simple white food",
    },
    conduct:
      "Treat partners and women with genuine respect, honour your commitments in relationships, and make room for balance, art and simple beauty.",
    lalKitab:
      "Keep relationships and surroundings clean and pleasant, respect your spouse, and donate white items on Fridays.",
    yantra: "Shukra Yantra",
  },
  Saturn: {
    planet: "Saturn",
    sanskritName: "Shani",
    deity: "Shani / Hanuman / Shiva",
    weekday: "Saturday",
    color: "dark blue, black",
    direction: "west",
    metal: "iron, panchdhatu",
    bodyAndLife:
      "discipline, endurance, work, longevity, joints, and lessons learned the slow way",
    beejMantra: "Om Praam Preem Praum Sah Shanaischaraya Namah",
    beejCount: 23000,
    vedicMantra:
      "Om Kaakadhvajaaya Vidmahe Khadgahastaaya Dheemahi Tanno Mandah Prachodayaat (Shani Gayatri)",
    stotra: "Dasharatha Shani Stotram / Hanuman Chalisa",
    gemstone: {
      primary: "Blue Sapphire (Neelam)",
      substitutes: ["amethyst", "blue spinel", "lapis lazuli"],
      metal: "iron, silver or panchdhatu",
      finger: "middle finger",
      day: "Saturday evening",
      wearingNote:
        "Blue Sapphire is the fastest-acting and the most cautioned stone. Traditionally it is TESTED by wearing for 3 days first, and worn only when Saturn is a functional benefic for you. Always consult a qualified astrologer before wearing — an amethyst substitute is the safer default.",
    },
    rudraksha: "7-mukhi or 14-mukhi",
    daana: {
      items: [
        "black sesame",
        "mustard oil",
        "iron",
        "black cloth",
        "urad dal",
      ],
      day: "Saturday",
      recipient: "labourers, the elderly, or the poor and overlooked",
    },
    vrata: {
      day: "Saturday",
      method:
        "an optional simple observance with service to workers and light food",
    },
    conduct:
      "Serve the elderly, labourers and people who are usually overlooked; practise patience and honest, unglamorous hard work instead of shortcuts.",
    lalKitab:
      "Serve labourers and the elderly, offer mustard oil on Saturdays, and keep your commitments faithfully.",
    yantra: "Shani Yantra",
  },
  Rahu: {
    planet: "Rahu",
    sanskritName: "Rahu",
    deity: "Durga / Bhairava",
    weekday: "Saturday",
    color: "smoky grey, mixed",
    direction: "southwest",
    metal: "lead, panchdhatu",
    bodyAndLife:
      "ambition, foreign and unconventional paths, obsession, and sudden turns",
    beejMantra: "Om Bhraam Bhreem Bhraum Sah Rahave Namah",
    beejCount: 18000,
    vedicMantra:
      "Om Naakadhvajaaya Vidmahe Padmahastaaya Dheemahi Tanno Rahuh Prachodayaat (Rahu Gayatri)",
    stotra: "Durga Saptashati / Rahu Stotram",
    gemstone: {
      primary: "Hessonite (Gomed)",
      substitutes: ["orange zircon", "agate"],
      metal: "silver or panchdhatu",
      finger: "middle finger",
      day: "Saturday evening",
      wearingNote:
        "Gomed is worn only on qualified astrological advice; Rahu remedies are more often propitiatory (mantra, charity) than strengthening. Confirm suitability first.",
    },
    rudraksha: "8-mukhi",
    daana: {
      items: ["black or blue cloth", "blankets", "coconut", "urad dal", "sesame"],
      day: "Saturday",
      recipient: "the marginalised or those without shelter",
    },
    vrata: {
      day: "Saturday",
      method: "an optional simple observance with Durga worship",
    },
    conduct:
      "Avoid shortcuts and deception, keep clear boundaries, and ground yourself with honest routine when things feel scattered or over-ambitious.",
    lalKitab:
      "Keep a solid silver item with you, give blankets to the needy, and avoid unethical shortcuts.",
    yantra: "Rahu Yantra",
  },
  Ketu: {
    planet: "Ketu",
    sanskritName: "Ketu",
    deity: "Ganesha / Bhairava",
    weekday: "Tuesday, Saturday",
    color: "grey, multicolour",
    direction: "—",
    metal: "panchdhatu",
    bodyAndLife:
      "detachment, insight, spirituality, past-life skills, and things that dissolve away",
    beejMantra: "Om Sraam Sreem Sraum Sah Ketave Namah",
    beejCount: 17000,
    vedicMantra:
      "Om Ashwadhvajaaya Vidmahe Shoolahastaaya Dheemahi Tanno Ketuh Prachodayaat (Ketu Gayatri)",
    stotra: "Ganesha Atharvashirsha / Ketu Stotram",
    gemstone: {
      primary: "Cat's Eye (Lehsunia)",
      substitutes: ["cat's eye quartz"],
      metal: "silver or panchdhatu",
      finger: "middle finger",
      day: "Saturday / Tuesday",
      wearingNote:
        "Worn only on qualified advice; like Rahu, Ketu is more often addressed with mantra, Ganesha worship and charity than with a stone.",
    },
    rudraksha: "9-mukhi",
    daana: {
      items: ["multicoloured cloth", "blankets", "sesame", "coconut"],
      day: "Saturday or Tuesday",
      recipient: "spiritual causes or those caring for animals",
    },
    vrata: {
      day: "Tuesday or Saturday",
      method: "an optional simple observance with Ganesha worship",
    },
    conduct:
      "Cultivate simplicity and letting go, reduce clutter and attachment, and give a little time to quiet spiritual practice that fits you.",
    lalKitab:
      "Feed dogs, keep a spiritual routine, and support Ganesha worship for clarity.",
    yantra: "Ketu Yantra",
  },
};

// Dosha-specific remedy sets, keyed by the ids from shared/doshas.ts.
export interface DoshaRemedy {
  label: string;
  primaryRemedies: string[];
  supportingPractices: string[];
  note: string;
}

export const DOSHA_REMEDIES: Record<string, DoshaRemedy> = {
  mangal: {
    label: "Mangal / Kuja Dosha",
    primaryRemedies: [
      "Regular Hanuman worship — Hanuman Chalisa on Tuesdays and Saturdays",
      "Recite or listen to the Mangala Stotram; the Mars beej mantra 'Om Kraam Kreem Kraum Sah Bhaumaya Namah'",
      "Optional Tuesday observance with simple food",
    ],
    supportingPractices: [
      "Donate red masoor dal, jaggery or copper on Tuesdays",
      "In matchmaking, a Manglik-Manglik pairing is traditionally considered to balance the effect; treat it as one factor among many, never a verdict",
      "Practise patience in speech and drive; direct Mars energy into exercise or disciplined work",
    ],
    note: "Mangal Dosha is a structural pattern with many regional cancellations, not a curse or a reason to reject a person. It should never be used to frighten anyone.",
  },
  "kaal-sarpa": {
    label: "Kaal Sarpa pattern",
    primaryRemedies: [
      "Rahu-Ketu / Naga propitiation — many visit Kalahasti or Trimbakeshwar for Naga Dosha puja, but a simple home practice is equally valid",
      "Recite the Maha Mrityunjaya mantra and worship Shiva",
      "Rahu and Ketu beej mantras on Saturdays",
    ],
    supportingPractices: [
      "Offer to Nagas (silver serpent image) and support snake/animal welfare",
      "Donate blankets, sesame and urad dal on Saturdays",
      "Keep conduct honest and boundaries clear",
    ],
    note: "Kaal Sarpa is a debated, structural node pattern. Many highly successful people have it. It is not a sentence of doom — avoid fear-based framing.",
  },
  kemadruma: {
    label: "Kemadruma (isolated Moon) pattern",
    primaryRemedies: [
      "Strengthen the Moon: Monday observance, Chandra beej mantra, and caring routines",
      "Worship Shiva/Parvati; recite the Annapurna Stotram",
      "Maintain warm, steady relationships and community — the practical antidote to lunar isolation",
    ],
    supportingPractices: [
      "Donate rice, milk or silver on Mondays",
      "Keep emotional and sleep routines regular",
    ],
    note: "Kemadruma has several classical cancellations (planets in kendra from Moon or Lagna, aspects). It describes a tendency to emotional isolation, not a fixed fate.",
  },
  "pitru-candidate": {
    label: "Pitru-related affliction pattern",
    primaryRemedies: [
      "Ancestral remembrance — Tarpan and Shraddha, especially during Pitru Paksha",
      "Feed and give respectfully to elders, priests and those in need in the ancestors' name",
      "Worship of Vishnu / the family deity",
    ],
    supportingPractices: [
      "Offer food to crows and cows",
      "Donate on Amavasya (new moon)",
      "Honour and reconcile with living elders where possible",
    ],
    note: "This is a structural screen, not a claim about your ancestors' morality or your family. It is addressed with respect and remembrance, never guilt.",
  },
};

// Sade Sati / Shani transit remedies are commonly asked for; kept separate so a
// transit context (not just a natal dosha) can surface them.
export const SADE_SATI_REMEDY: DoshaRemedy = {
  label: "Sade Sati / Shani transit",
  primaryRemedies: [
    "Hanuman Chalisa and Shani stotra; the Shani beej mantra on Saturdays",
    "Serve labourers, the elderly and the disadvantaged — the heart of every Saturn remedy",
    "Offer mustard/sesame oil to Shani on Saturdays where that is your tradition",
  ],
  supportingPractices: [
    "Donate black sesame, iron, urad dal or a warm blanket on Saturdays",
    "Simplify commitments, work patiently and honestly, and avoid shortcuts",
    "Amethyst is the safe substitute if a Blue Sapphire is not astrologically confirmed",
  ],
  note: "Sade Sati is a slow maturing period, not a disaster. Its remedies are about discipline, service and patience — never fear.",
};
