import "./welcome.css";
import { useLang, type Lang } from "../lang";
import { StatusBar } from "../shell";

/**
 * First-run language chooser. Shown before onboarding until the user picks a
 * language. The choice drives the whole UI and the AI's reply language, and can
 * be changed later from More → Language.
 */
export function WelcomeScreen({ onChosen }: { onChosen: (l: Lang) => void }) {
  const { setLang } = useLang();

  const pick = (l: Lang) => {
    setLang(l);
    onChosen(l);
  };

  return (
    <>
      <StatusBar />
      <div className="welcome-screen">
        <span className="wmark" aria-hidden="true" />
        <p className="brand">
          Sahadeva · <span lang="te">సహదేవ</span>
        </p>
        <h1>Namaste</h1>
        <p className="wsub">
          A transparent Jyotish reading of your chart.
          <br />
          మీ జాతకానికి పారదర్శక జ్యోతిష పఠనం.
        </p>

        <p className="wprompt">
          Choose your language
          <span>మీ భాషను ఎంచుకోండి</span>
        </p>
        <div className="wbtns">
          <button className="wbtn" type="button" onClick={() => pick("en")}>
            <span className="native">English</span>
          </button>
          <button className="wbtn" type="button" onClick={() => pick("te")}>
            <span className="native">తెలుగు</span>
            <span className="roman">Telugu</span>
          </button>
        </div>

        <p className="wnote">
          Everything — the app and the answers — will be in the language you pick. You can change it anytime in More → Language.
          <br />
          యాప్, సమాధానాలు అన్నీ మీరు ఎంచుకున్న భాషలోనే ఉంటాయి. దీన్ని More → భాషలో ఎప్పుడైనా మార్చుకోవచ్చు.
        </p>
      </div>
    </>
  );
}
