import { useLang } from "../lang";

const privacySections = [
  ["What Sahadeva processes", "Your birth details, profile information, questions, saved conversations, and feedback are processed only to calculate charts, provide readings, restore your account, and improve reliability."],
  ["Voice input", "Recorded audio is sent for transcription and is not intentionally stored by Sahadeva. The resulting text is treated like a typed question. You can review it before sending."],
  ["Storage and accounts", "Guest information stays on the device unless you create an account. Account data is stored in protected systems and sensitive profile snapshots are encrypted at rest."],
  ["Analytics", "Sahadeva records limited product and reliability events. Inputs, birth details, questions, readings, and email addresses are excluded from analytics properties, and recorded sessions mask text."],
  ["Service providers", "Cloudflare provides hosting, database, security, and some AI processing. Additional AI providers may process a request when needed for transcription or an answer."],
  ["Your choices", "You may use Sahadeva without an account, correct your information, export information made available to you, or request deletion of account data."],
  ["Retention and security", "Information is retained only as needed to provide the service, meet legal obligations, prevent abuse, and maintain backups. No internet service can guarantee absolute security."],
  ["Contact", "For privacy questions or deletion requests, contact the Sahadeva operator through the support channel provided with your account or deployment."],
] as const;

const termsSections = [
  ["Interpretive service", "Sahadeva presents Jyotisha as an interpretive cultural practice. Readings are not guarantees or statements of fact about future events."],
  ["Not professional advice", "Do not use Sahadeva as a substitute for medical, mental-health, legal, financial, safety, or other qualified professional advice."],
  ["Your information", "Provide information you have permission to use. You are responsible for checking birth details, transcription text, and other inputs before relying on a result."],
  ["Acceptable use", "Do not misuse the service, evade limits, probe protected systems, upload unlawful material, or use results to harass, discriminate against, or make high-impact decisions about another person."],
  ["Accounts", "Keep account credentials secure. You are responsible for activity under your account and should notify the operator if you suspect unauthorized access."],
  ["Availability", "The service may change, experience interruptions, or return incomplete results. Calculated and AI-generated material may contain errors."],
  ["Liability", "To the extent permitted by law, Sahadeva is provided without warranties and the operator is not responsible for decisions made solely from an interpretation."],
  ["Changes and contact", "Material changes will be reflected on this page. Questions can be sent through the support channel provided with your account or deployment."],
] as const;

export function LegalScreen({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useLang();
  const privacy = kind === "privacy";
  const sections = privacy ? privacySections : termsSections;
  return <>
    <div className="topbar"><a className="backbtn" href="/#more" aria-label={t("Back", "వెనుకకు")}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></a></div>
    <main className="screen legal-screen" id="content">
      <header>
        <p className="eyebrow">Sahadeva</p>
        <h1>{privacy ? t("Privacy policy", "గోప్యతా విధానం") : t("Terms of use", "వినియోగ నిబంధనలు")}</h1>
        <p className="legal-updated">{t("Effective 4 September 2026", "4 సెప్టెంబర్ 2026 నుండి అమల్లో")}</p>
      </header>
      <p className="legal-summary">{privacy
        ? t("This policy explains what Sahadeva processes and the choices available to you.", "సహదేవ ఏ సమాచారాన్ని ప్రాసెస్ చేస్తుంది, మీకు ఉన్న ఎంపికలు ఏమిటో ఈ విధానం వివరిస్తుంది.")
        : t("These terms set the boundaries for using Sahadeva responsibly.", "సహదేవను బాధ్యతగా ఉపయోగించడానికి ఈ నిబంధనలు పరిమితులను వివరిస్తాయి.")}</p>
      <div className="legal-sections">
        {sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}
      </div>
      <p className="legal-disclaimer">This operational draft should be reviewed by qualified counsel for every jurisdiction where Sahadeva is offered.</p>
    </main>
  </>;
}

export function NotFoundScreen() {
  const { t } = useLang();
  return <main className="screen legal-screen not-found" id="content">
    <p className="eyebrow">404</p>
    <h1>{t("This page is not here", "ఈ పేజీ అందుబాటులో లేదు")}</h1>
    <p>{t("The address may have changed. Return to Sahadeva to continue with your chart and conversations.", "చిరునామా మారి ఉండవచ్చు. మీ జాతకం, సంభాషణలను కొనసాగించడానికి సహదేవకు తిరిగి వెళ్లండి.")}</p>
    <a className="legal-home" href="/#ask">{t("Return to Sahadeva", "సహదేవకు తిరిగి వెళ్లండి")}</a>
  </main>;
}

export function SupportScreen() {
  const { t } = useLang();
  return <>
    <div className="topbar"><a className="backbtn" href="/#more" aria-label={t("Back", "వెనుకకు")}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></a></div>
    <main className="screen legal-screen" id="content">
      <header><p className="eyebrow">Sahadeva</p><h1>{t("Support", "సహాయం")}</h1></header>
      <p className="legal-summary">{t("Get help with accounts, calculations, privacy requests, or unexpected results.", "ఖాతాలు, గణనలు, గోప్యతా అభ్యర్థనలు లేదా అనుకోని ఫలితాలపై సహాయం పొందండి.")}</p>
      <div className="legal-sections">
        <section><h2>{t("Report a problem", "సమస్యను నివేదించండి")}</h2><p>{t("Open a support issue and include what you expected, what happened, and the calculation inputs needed to reproduce the problem. Never include passwords, API keys, or payment details.", "సహాయ అభ్యర్థనను తెరిచి, మీరు ఆశించినది, జరిగినది, సమస్యను పునరుత్పత్తి చేయడానికి అవసరమైన గణన వివరాలను జోడించండి. పాస్‌వర్డ్‌లు, API కీలు లేదా చెల్లింపు వివరాలను ఎప్పుడూ చేర్చవద్దు.")}</p><p><a className="legal-home" href="https://github.com/everyai-com/sahadeva/issues" target="_blank" rel="noreferrer">{t("Open Sahadeva support", "సహదేవ సహాయాన్ని తెరవండి")}</a></p></section>
        <section><h2>{t("Privacy and deletion", "గోప్యత మరియు తొలగింపు")}</h2><p>{t("Use the same support channel for data-access or deletion requests. State that the request is privacy-related; do not post birth details publicly.", "డేటా యాక్సెస్ లేదా తొలగింపు అభ్యర్థనలకు అదే సహాయ మార్గాన్ని ఉపయోగించండి. అభ్యర్థన గోప్యతకు సంబంధించినదని పేర్కొనండి; జనన వివరాలను బహిరంగంగా పోస్ట్ చేయవద్దు.")}</p></section>
      </div>
    </main>
  </>;
}

export default function LegalScreens({ kind = "privacy", notFound = false, support = false }: { kind?: "privacy" | "terms"; notFound?: boolean; support?: boolean }) {
  if (notFound) return <NotFoundScreen />;
  if (support) return <SupportScreen />;
  return <LegalScreen kind={kind} />;
}
