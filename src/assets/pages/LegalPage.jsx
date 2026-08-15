import { useEffect } from "react";
import Footer from "../components/Footer";
import MarketingNavBar from "../components/MarketingNavBar";

// Renders a legal document from raw HTML.
//
// The markup is generator output (Termly) full of editor artefacts -- <bdt>
// wrappers, mso-* Word styles, conditional-block spans. It is injected
// verbatim rather than converted to JSX on purpose: this is legally
// operative text, and a conversion pass is a chance to silently alter or
// drop a clause. Unknown elements like <bdt> render as inline spans, so they
// are harmless.
//
// dangerouslySetInnerHTML is safe here specifically because the source is a
// static file committed to this repo, not anything a user can supply. It must
// stay that way -- never point this at content from the database or a URL.
export default function LegalPage({ title, html, lastUpdatedNote }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Kollab`;
    return () => { document.title = previous; };
  }, [title]);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "white", minHeight: "100vh", textAlign: "left" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }

        /* Constrain the generator's markup so it reads as part of the site.
           Scoped under .kollab-legal-doc so none of it leaks to other pages. */
        .kollab-legal-doc { color: #434654; font-size: 15px; line-height: 1.65; }
        .kollab-legal-doc h1 { font-size: 30px; color: #0b1c30; margin: 0 0 8px 0; }
        .kollab-legal-doc h2 { font-size: 20px; color: #0b1c30; margin: 32px 0 10px 0; }
        .kollab-legal-doc h3 { font-size: 16px; color: #0b1c30; margin: 22px 0 8px 0; }
        .kollab-legal-doc a { color: #2563eb; word-break: break-word; }
        .kollab-legal-doc ul { padding-left: 22px; }
        .kollab-legal-doc li { margin-bottom: 8px; }
        /* The generator hardcodes Arial and fixed pixel sizes inline. Left
           alone deliberately -- overriding with !important fights every
           inline style in the document and tends to break more than it fixes. */
        .kollab-legal-doc img, .kollab-legal-doc table { max-width: 100%; }

        @media (max-width: 768px) {
          .kollab-legal-wrap { padding: 96px 20px 48px 20px !important; }
        }
      `}</style>

      <MarketingNavBar />

      <div className="kollab-legal-wrap" style={{ maxWidth: 860, margin: "0 auto", padding: "128px 24px 64px 24px", boxSizing: "border-box" }}>
        {lastUpdatedNote && (
          <p style={{ color: "#737686", fontSize: 13, margin: "0 0 24px 0" }}>{lastUpdatedNote}</p>
        )}
        <div className="kollab-legal-doc" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <Footer />
    </div>
  );
}
