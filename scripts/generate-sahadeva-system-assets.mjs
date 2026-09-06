import { mkdir, writeFile } from "node:fs/promises";

const root = new URL("../public/brand/sahadeva/", import.meta.url);
const stroke = `fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
const svg = (body, size, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="${title}"><title>${title}</title><g ${stroke}>${body}</g></svg>\n`;
const writeFamily = async (family, items, sizes = [24, 48, 128]) => {
  await mkdir(new URL(`${family}/`, root), { recursive: true });
  for (const item of items) for (const size of sizes) {
    const field = size === 128 ? `<circle cx="12" cy="12" r="10.5" opacity=".18"/><path d="M12 1.5v1M12 21.5v1M1.5 12h1M21.5 12h1" opacity=".28"/>` : "";
    await writeFile(new URL(`${family}/${item.id}-${size}.svg`, root), svg(`${field}${item.body}`, size, `${item.name}: ${item.meaning}`));
  }
};

const rashi = [
  ["mesha","Meṣa","initiative",`<path d="M12 20V9C12 4 7 3 5 6c-1.3 2 .2 4 2 4 2.8 0 4-3 5-6M12 9c0-5 5-6 7-3 1.3 2-.2 4-2 4-2.8 0-4-3-5-6"/>`],
  ["vrishabha","Vṛṣabha","stability",`<path d="M6 4c1 4 3 5 6 5s5-1 6-5M7 4c-3 1-3 5 0 7M17 4c3 1 3 5 0 7"/><circle cx="12" cy="14" r="5"/>`],
  ["mithuna","Mithuna","exchange",`<circle cx="8" cy="7" r="2"/><circle cx="16" cy="7" r="2"/><path d="M8 9v9M16 9v9M5 18h6M13 18h6M9 12h6"/>`],
  ["karka","Karka","protection",`<path d="M7 8c-3 0-4 2-4 4s2 4 5 4h3M17 8c3 0 4 2 4 4s-2 4-5 4h-3M7 8l3-3M17 8l-3-3"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>`],
  ["simha","Siṃha","leadership",`<circle cx="12" cy="12" r="4"/><path d="M12 3c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 2-7 5-8M9 11c1-1 5-1 6 0M10 15c1 1 3 1 4 0"/>`],
  ["kanya","Kanyā","discernment",`<circle cx="10" cy="5" r="2"/><path d="M10 7v8M6 11h8M7 20l3-5 3 5M16 7v11M16 18l3-3M16 14l3 3"/>`],
  ["tula","Tulā","balance",`<path d="M4 19h16M6 16h12M12 5v11M5 8h14M5 8l-2 5h4L5 8ZM19 8l-2 5h4l-2-5Z"/>`],
  ["vrischika","Vṛścika","transformation",`<path d="M4 7v8c0 3 4 3 4 0V8c0-2 4-2 4 0v7c0 3 4 3 4 0V8M16 15c1 3 3 4 5 2M19 15l2 2-2 2"/>`],
  ["dhanus","Dhanus","purpose",`<path d="M5 19 19 5M13 5h6v6M6 7c4 2 7 5 9 9M5 6l-1 4 4-1"/>`],
  ["makara","Makara","endurance",`<path d="M4 9c3-5 8-5 11-1 2 3 1 7-2 9-2 1-1 4 2 4 3 0 5-2 5-5M4 9c2 1 3 3 3 5M4 9 3 6M8 7 6 4"/>`],
  ["kumbha","Kumbha","distribution",`<path d="M8 4h8l-1 3v11c0 2-6 2-6 0V7L8 4ZM9 9h6M10 20c-2 1-4 1-6 0M14 20c2 1 4 1 6 0"/>`],
  ["mina","Mīna","flow",`<path d="M4 8c4-3 7-2 8 4-1 6-4 7-8 4l2-4-2-4ZM20 8c-4-3-7-2-8 4 1 6 4 7 8 4l-2-4 2-4Z"/>`],
].map(([id,name,meaning,body]) => ({id,name,meaning,body}));

const bhava = [
  ["tanu","Tanu","you and your body",`<circle cx="12" cy="6" r="2.5"/><path d="M12 8.5v9M7 12h10M9 21l3-3.5 3 3.5"/>`],
  ["dhana","Dhana","money and resources",`<path d="M6 7h12l-1 13H7L6 7ZM8 7c0-4 8-4 8 0M9 12h6M9 16h6"/>`],
  ["sahaja","Sahaja","courage, skills and siblings",`<path d="M12 4v16M12 8 6 5M12 8l6-3M12 15 6 19M12 15l6 4"/><circle cx="6" cy="5" r="1.5"/><circle cx="18" cy="5" r="1.5"/>`],
  ["bandhu","Bandhu","home, mother and inner peace",`<path d="m4 11 8-7 8 7v9H4v-9ZM8 20v-6h8v6M12 14v-4"/>`],
  ["putra","Putra","children, creativity and intelligence",`<path d="M12 21V9M12 12c-5 0-7-3-7-6 4 0 7 1 7 6ZM12 15c5 0 7-3 7-6-4 0-7 1-7 6Z"/>`],
  ["ari","Ari","health, challenges and daily work",`<path d="M4 18 9 6l3 7 3-4 5 9M3 18h18"/>`],
  ["yuvati","Yuvati","marriage and partnerships",`<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/><path d="M10 12h4"/>`],
  ["randhra","Randhra","change, longevity and hidden matters",`<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M9 12h6M15 10v4"/>`],
  ["dharma","Dharma","purpose, fortune and higher guidance",`<path d="M5 20 12 4l7 16M8 14h8M12 4v16"/><circle cx="12" cy="4" r="1.5"/>`],
  ["karma","Karma","career, work and reputation",`<path d="M5 20V9h14v11M9 9V5h6v4M3 20h18M9 14h6"/>`],
  ["labha","Lābha","gains, income and opportunities",`<path d="M4 5l8 7 8-7M12 12v9M6 17h12M8 14l4 3 4-3"/>`],
  ["vyaya","Vyaya","expenses, release and inner life",`<circle cx="10" cy="12" r="6"/><path d="M14 8l6-4M17 4h3v3M14 16l6 4M17 20h3v-3"/>`],
].map(([id,name,meaning,body]) => ({id,name,meaning,body}));

const nakData = [
  ["ashwini","Aśvinī","beginnings and healing","pair"],["bharani","Bharaṇī","containment and transition","vessel"],["krittika","Kṛttikā","clarity and purification","cut"],["rohini","Rohiṇī","growth and creation","sprout"],["mrigashirsha","Mṛgaśīrṣa","curiosity and seeking","antler"],["ardra","Ārdrā","release after disturbance","storm"],["punarvasu","Punarvasu","return and restoration","return"],["pushya","Puṣya","care and development","seed"],["ashlesha","Āśleṣā","binding and depth","coil"],["magha","Maghā","ancestry and lineage","seat"],["purva-phalguni","Pūrvaphālgunī","sharing and enjoyment","share"],["uttara-phalguni","Uttaraphālgunī","commitment and alliance","join"],["hasta","Hasta","skill and making","hand"],["chitra","Citrā","design and brilliance","facet"],["swati","Svātī","independence and movement","wind"],["vishakha","Viśākhā","branching goals","branch"],["anuradha","Anurādhā","friendship and cooperation","meet"],["jyeshtha","Jyeṣṭhā","seniority and protection","crown"],["mula","Mūla","root cause and dismantling","root"],["purva-ashadha","Pūrvāṣāḍhā","renewal and conviction","streams"],["uttara-ashadha","Uttarāṣāḍhā","collective endurance","build"],["shravana","Śravaṇa","listening and learning","sound"],["dhanishtha","Dhaniṣṭhā","resources and rhythm","eight"],["shatabhisha","Śatabhiṣaj","healing and restoration","healers"],["purva-bhadrapada","Pūrvabhādrapadā","focus and transformation","support"],["uttara-bhadrapada","Uttarabhādrapadā","deep stability","deep"],["revati","Revatī","protection and completion","journey"],
];
const motif = (kind) => ({
  pair:`<path d="M5 17 10 7l2 5 2-5 5 10M5 17h14"/>`, vessel:`<path d="M7 5h10l-1 14H8L7 5ZM9 9h6"/>`, cut:`<path d="M5 19 19 5M7 5l12 12M12 3v18"/>`, sprout:`<path d="M12 21V9M12 13c-5 0-7-3-7-6 4 0 7 1 7 6M12 16c5 0 7-3 7-6-4 0-7 1-7 6"/>`, antler:`<path d="M12 20V9M12 11 7 6M8 7V3M8 7H4M12 11l5-5M16 7V3M16 7h4"/>`, storm:`<path d="M12 3c4 5 6 7 6 11a6 6 0 0 1-12 0c0-4 2-6 6-11ZM4 6h4M16 6h4"/>`, return:`<path d="M18 8a7 7 0 1 0 1 7M18 8V4M18 8h-4"/>`, seed:`<path d="M12 20V9M12 9c-5 0-6-3-6-6 4 0 6 2 6 6ZM12 9c5 0 6-3 6-6-4 0-6 2-6 6"/><path d="M7 20h10"/>`, coil:`<path d="M17 6c-5-4-11 0-10 5 1 5 9 5 10 1 1-3-4-4-5-1-1 2 2 4 4 2"/>`, seat:`<path d="M6 19V9h12v10M4 19h16M8 9V5h8v4M10 5l2-2 2 2"/>`, share:`<circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><path d="M10 12h4"/>`, join:`<path d="M5 8h5l2 4 2-4h5M5 16h5l2-4 2 4h5"/>`, hand:`<path d="M7 12V6M10 11V4M13 11V5M16 12V7M7 10c-3 0-3 4-1 7 3 5 10 4 12 0 1-2 1-5-2-5"/>`, facet:`<path d="m12 3 7 6-3 10H8L5 9l7-6ZM5 9h14M8 19l4-10 4 10"/>`, wind:`<path d="M3 8h11c4 0 4-5 1-5M3 12h16c4 0 3 5 0 5M3 16h9"/>`, branch:`<path d="M12 21V11M12 11 6 5M12 11l6-6M6 5h4M18 5h-4"/>`, meet:`<path d="M4 5c4 0 4 7 8 7s4-7 8-7M4 19c4 0 4-7 8-7s4 7 8 7"/><circle cx="12" cy="12" r="1"/>`, crown:`<path d="m5 17-1-9 5 4 3-7 3 7 5-4-1 9H5ZM5 20h14"/>`, root:`<path d="M12 3v9M12 12l-6 8M12 12l6 8M9 16l-4-1M15 16l4-1M12 17v4"/>`, streams:`<path d="M4 4c0 7 8 5 8 16M12 4v16M20 4c0 7-8 5-8 16"/>`, build:`<path d="M4 19h16M6 19v-5h4v5M10 19v-9h4v9M14 19V6h4v13"/>`, sound:`<path d="M7 12c3-2 3-6 6-6 5 0 6 8 1 9-2 0-2 3-4 4M4 8c2 1 2 7 0 8M20 8c-2 1-2 7 0 8"/>`, eight:`<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><circle cx="12" cy="12" r="4"/>`, healers:`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1"/>`, support:`<path d="M12 21V4M12 4 6 10M12 4l6 6M6 10h12"/>`, deep:`<path d="M4 8h16M12 8v13M12 12c5 0 6 3 6 6M12 15c-5 0-6 3-6 6"/>`, journey:`<path d="M4 18c4 0 5-12 10-12 4 0 4 5 6 5M17 8l3 3-3 3"/><circle cx="4" cy="18" r="1.5"/>`
}[kind]);
const nakshatra = nakData.map(([id,name,meaning,kind]) => ({id,name,meaning,body:motif(kind)}));

await writeFamily("rashi", rashi);
await writeFamily("bhava", bhava);
await writeFamily("nakshatra", nakshatra, [24,128]);

const lifeAreas = ["career","business","money","marriage","love","children","family","health","education","home","property","travel"].map((id,i)=>({ id, name:id[0].toUpperCase()+id.slice(1), meaning:`${id} life area`, body:[bhava[9].body,bhava[9].body,bhava[1].body,bhava[6].body,`<path d="M12 20S4 15 4 9c0-5 6-6 8-2 2-4 8-3 8 2 0 6-8 11-8 11Z"/>`,bhava[4].body,`<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="12" cy="13" r="2"/><path d="M3 20c0-4 2-7 5-7M21 20c0-4-2-7-5-7M8 20c0-3 1-5 4-5s4 2 4 5"/>`,`<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="7"/>`,`<path d="m3 9 9-5 9 5-9 5-9-5ZM6 11v6c4 3 8 3 12 0v-6"/>`,bhava[3].body,bhava[3].body,`<path d="m3 14 7-2 4-8 2 1-2 8 6 3-1 2-7-2-4 5-1-1 2-5-6 1Z"/>`][i] }));
const remedy = [["mantra","Mantra",`<path d="M5 8c4-4 10-4 14 0M5 12c4-4 10-4 14 0M5 16c4-4 10-4 14 0"/>`],["puja","Pūjā",`<path d="M6 19h12M8 16h8M10 13h4M12 13V6M9 7c0-3 6-3 6 0"/>`],["temple","Temple",`<path d="M4 20h16M6 17h12M7 17V9h10v8M5 9h14L12 3 5 9Z"/>`],["dana","Dāna",`<path d="M4 12h6l2 2h8M4 12v5c4 3 10 3 16 0v-3M7 9c0-4 5-5 5-1 0-4 5-3 5 1 0 3-5 5-5 5S7 12 7 9Z"/>`],["vrata","Vrata",`<path d="M12 3c5 4 7 8 7 12a7 7 0 0 1-14 0c0-4 2-8 7-12ZM9 15h6"/>`],["gemstone","Gemstone",`<path d="m12 3 8 6-4 11H8L4 9l8-6ZM4 9h16M8 20l4-11 4 11"/>`],["yantra","Yantra",`<circle cx="12" cy="12" r="9"/><path d="m12 4 6 12H6L12 4Zm0 16L6 8h12l-6 12Z"/>`],["homa","Homa",`<path d="M6 20h12l2-5H4l2 5ZM12 14c-4-3-2-6 1-10 0 4 5 4 2 10"/>`],["seva","Sevā",`<path d="M4 13h5l3 3 8-6M4 13v5c5 3 10 3 16 0"/>`]].map(([id,name,body])=>({id,name,meaning:"remedy guidance",body}));
const timings = [["sunrise","Sūryodaya",`<path d="M3 18h18M5 14h14M12 4v4M5 8l3 3M19 8l-3 3M8 14a4 4 0 0 1 8 0"/>`],["sunset","Sūryāsta",`<path d="M3 15h18M5 19h14M12 4v4M8 15a4 4 0 0 1 8 0"/>`],["rahu-kala","Rāhu Kāla",`<circle cx="11" cy="12" r="7"/><path d="M13 5.5a7 7 0 0 1 3 12 6 6 0 0 1-5-11"/>`],["yamagandam","Yamagandam",`<path d="M3 12h7l2-4 3 8 2-4h4M10 5l4 14"/>`],["gulika","Gulika Kāla",`<path d="M4 17h16M7 14h10M8 11a4 4 0 0 1 8 0v3H8v-3ZM5 8a7 7 0 0 1 14 0"/>`],["abhijit","Abhijit Muhūrta",`<path d="M3 18h18M12 3v4M6 7l3 3M18 7l-3 3M7 18a5 5 0 0 1 10 0"/><circle cx="12" cy="13" r="2"/>`],["durmuhurta","Durmuhūrta",`<path d="M3 12h6l2-3 3 6 2-3h5M5 6l14 12"/>`]].map(([id,name,body])=>({id,name,meaning:"daily timing",body}));
await writeFamily("life-area",lifeAreas,[24,48]);
await writeFamily("remedy",remedy,[24,48]);
await writeFamily("timing",timings,[24,48]);

await mkdir(new URL("panchanga/tithi/", root), { recursive: true });
for (let i=1;i<=30;i++) {
  const phase = i <= 15 ? i / 15 : (30-i) / 15;
  const x = 7 + phase * 10;
  const waxing = i <= 15;
  const body = `<circle cx="12" cy="12" r="8"/><path d="M12 4c${waxing ? x-12 : 12-x} 3 ${waxing ? x-12 : 12-x} 13 0 16"/><path d="M12 4a8 8 0 0 ${waxing ? 1 : 0} ${waxing ? 0 : 1} 0 16" opacity=".24"/>`;
  await writeFile(new URL(`panchanga/tithi/tithi-${String(i).padStart(2,"0")}.svg`, root), svg(body, 24, `Tithi ${i}: lunar phase progress`));
}

const yogaNames = ["vishkambha","priti","ayushman","saubhagya","shobhana","atiganda","sukarma","dhriti","shula","ganda","vriddhi","dhruva","vyaghata","harshana","vajra","siddhi","vyatipata","variyan","parigha","shiva","siddha","sadhya","shubha","shukla","brahma","indra","vaidhriti"];
await mkdir(new URL("panchanga/yoga/", root), { recursive: true });
for (let i=0;i<yogaNames.length;i++) {
  const a = 4 + (i%5), b = 20-(i%4);
  const body = `<circle cx="${a}" cy="8" r="2"/><circle cx="${b}" cy="16" r="2"/><path d="M${a+2} 9.5 12 12l${b-14} 2.5M12 5v14"/><circle cx="12" cy="12" r="${3+(i%3)}" opacity=".35"/>`;
  await writeFile(new URL(`panchanga/yoga/${yogaNames[i]}.svg`, root), svg(body, 24, `${yogaNames[i]} Nitya Yoga relationship`));
}

const karanas = ["bava","balava","kaulava","taitila","gara","vanija","vishti","shakuni","chatushpada","naga","kimstughna"];
await mkdir(new URL("panchanga/karana/", root), { recursive: true });
for (let i=0;i<karanas.length;i++) {
  const body = `<path d="M4 ${6+i%4}h16M${6+i%3} 4v16M18 4v16M5 18l${7+i%4-4}-6 7 6"/><circle cx="12" cy="12" r="${2+i%3}" opacity=".35"/>`;
  await writeFile(new URL(`panchanga/karana/${karanas[i]}.svg`, root), svg(body, 24, `${karanas[i]} Karana`));
}

const registry = {
  schemaVersion:"1.1.0",
  generatedAt:"source-controlled",
  provenance:{
    policy:"research-informed-modern-visual-interpretation",
    culturalApproval:"pending-qualified-human-review",
    sourceLedger:"/docs/design/SAHADEVA_ASSET_PROVENANCE.md",
    sources:{
      bpHs:{ title:"Bṛhat Parāśara Horā Śāstra", role:"classical terminology and Jyotiṣa relationship model", url:"https://sanskritdocuments.org/sanskrit/brihatparashara/" },
      rashtriyaPanchang:{ title:"Rashtriya Panchang — Positional Astronomy Centre", role:"standardized pañcāṅga terminology and calculated calendric elements", url:"https://www.packolkata.gov.in/rp.php" },
      designSystem:{ title:"Sahadeva Design System", role:"modern shape, stroke, accessibility, motion and consumer-language rules", path:"/docs/design/SAHADEVA_DESIGN_SYSTEM.md" }
    },
    families:{
      rashi:{ sourceBasis:["bpHs","designSystem"], visualStatus:"modern-interpretation", review:"required" },
      bhava:{ sourceBasis:["bpHs","designSystem"], visualStatus:"modern-interpretation", review:"required" },
      nakshatra:{ sourceBasis:["bpHs","designSystem"], visualStatus:"modern-interpretation", review:"required" },
      tithi:{ sourceBasis:["rashtriyaPanchang","designSystem"], visualStatus:"calculation-derived-lunar-phase", review:"required" },
      yoga:{ sourceBasis:["rashtriyaPanchang","designSystem"], visualStatus:"modern-relational-abstraction", review:"required" },
      karana:{ sourceBasis:["rashtriyaPanchang","designSystem"], visualStatus:"modern-temporal-abstraction", review:"required" },
      timing:{ sourceBasis:["rashtriyaPanchang","designSystem"], visualStatus:"modern-interface-metaphor", review:"required" },
      lifeArea:{ sourceBasis:["designSystem"], visualStatus:"consumer-interface-metaphor", review:"product-reviewed" },
      remedy:{ sourceBasis:["designSystem"], visualStatus:"consumer-interface-metaphor-not-prescription", review:"required" }
    }
  },
  families:{ rashi:rashi.map(x=>x.id), bhava:bhava.map(x=>x.id), nakshatra:nakshatra.map(x=>x.id), lifeArea:lifeAreas.map(x=>x.id), remedy:remedy.map(x=>x.id), timing:timings.map(x=>x.id), tithi:Array.from({length:30},(_,i)=>i+1), yoga:yogaNames, karana:karanas }
};
await writeFile(new URL("system-registry.json", root), `${JSON.stringify(registry,null,2)}\n`);
const cards = (family, items, size) => items.map(x => `<figure><img src="./${family}/${x.id}-${size}.svg" alt=""><figcaption><b>${x.name}</b><span>${x.meaning}</span></figcaption></figure>`).join("");
const illustrations = ["surya","chandra","mangala","budha","guru","shukra","shani","rahu","ketu"].map(id => `<figure class="story"><img src="./illustrations/${id}-v1.webp" alt="${id} narrative illustration candidate"><figcaption><b>${id}</b><span>Pending human cultural review</span></figcaption></figure>`).join("");
const catalog = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sahadeva visual language</title><style>:root{font-family:Inter,system-ui;color:#20201e;background:#f7f6f2}*{box-sizing:border-box}body{margin:0}header{padding:64px clamp(20px,6vw,96px);background:#242532;color:#f7f6f2}header img{width:240px;filter:brightness(0) invert(1)}h1{font:500 clamp(42px,7vw,88px)/1 Georgia,serif;margin:36px 0 12px;max-width:900px}header p{max-width:680px;color:#cbc8bd;font-size:18px;line-height:1.6}main{padding:56px clamp(20px,6vw,96px) 100px}section{margin-top:70px}h2{font:500 34px/1.1 Georgia,serif;margin:0 0 22px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px}figure{margin:0;padding:18px;background:#fff;border:1px solid #e2e0da;border-radius:14px;min-height:170px;display:grid;place-items:center;align-content:center;gap:14px}figure>img{width:72px;height:72px}figcaption{text-align:center}figcaption b,figcaption span{display:block;text-transform:capitalize}figcaption span{font-size:12px;color:#6c6b67;margin-top:4px}.stories{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}.story{padding:0;overflow:hidden;display:block}.story>img{width:100%;height:auto;aspect-ratio:3/2;object-fit:cover}.story figcaption{padding:14px 16px 18px;text-align:left}</style></head><body><header><img src="./lockup-reverse.svg" alt="Sahadeva"><h1>Traditional in meaning. Modern in expression. Human in explanation.</h1><p>The canonical, source-controlled visual language. Every unfamiliar symbol ships with a name, plain-language meaning, accessible fallback, and stable asset ID.</p></header><main><section><h2>Rāśi</h2><div class="grid">${cards("rashi",rashi,128)}</div></section><section><h2>Bhāva</h2><div class="grid">${cards("bhava",bhava,128)}</div></section><section><h2>Nakṣatra</h2><div class="grid">${cards("nakshatra",nakshatra,128)}</div></section><section><h2>Life areas</h2><div class="grid">${cards("life-area",lifeAreas,48)}</div></section><section><h2>Remedies</h2><div class="grid">${cards("remedy",remedy,48)}</div></section><section><h2>Daily time</h2><div class="grid">${cards("timing",timings,48)}</div></section><section><h2>Narrative illustration candidates</h2><div class="grid stories">${illustrations}</div></section></main></body></html>`;
await writeFile(new URL("catalog.html", root), catalog);
console.log(`Generated ${rashi.length*3 + bhava.length*3 + nakshatra.length*2 + 30 + yogaNames.length + karanas.length} system assets.`);
