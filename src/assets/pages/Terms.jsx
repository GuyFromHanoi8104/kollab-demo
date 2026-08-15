import LegalPage from "./LegalPage";
// Vite's ?raw suffix imports the file as a string at build time, so the legal
// text lives in a plain .html file that can be replaced wholesale when it is
// regenerated -- no JSX to re-hand-convert each time.
import termsHtml from "../legal/terms.html?raw";

export default function Terms() {
  return <LegalPage title="Terms and Conditions" html={termsHtml} />;
}
