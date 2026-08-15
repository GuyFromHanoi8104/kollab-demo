import LegalPage from "./LegalPage";
import privacyHtml from "../legal/privacy.html?raw";

// The route exists even before the document does, because Sign Up already
// links to it -- an unpublished-notice is better than a 404 on a link users
// are asked to agree to. privacy.html carries that notice until the real
// text replaces it.
export default function Privacy() {
  return <LegalPage title="Privacy Policy" html={privacyHtml} />;
}
