import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Fades each route in on navigation, and puts the viewport back at the top.
//
// Two deliberate choices here.
//
// It fades rather than slides. A translateY would look better in isolation, but
// `transform` on an ancestor becomes the containing block for every
// position: fixed and position: absolute descendant -- and this app puts its
// chrome exactly there: MarketingNavBar, AppTopBar and the portal-free modals
// are all absolutely or fixed positioned inside the page. Sliding the wrapper
// would drag the header along with the content and shift fixed overlays for the
// duration of the animation. Opacity creates a stacking context but not a
// containing block, so it leaves all of that alone.
//
// It also scrolls to top. React Router doesn't do this by default, so clicking
// a creator from halfway down Discover previously landed you halfway down their
// profile -- which reads as a broken page rather than a navigation.
const DURATION_MS = 200;

export default function PageTransition({ children }) {
  const { pathname } = useLocation();

  useEffect(() => {
    // "instant" rather than smooth: a smooth scroll racing a fade-in reads as
    // two competing animations.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    // Keyed on pathname so the animation replays per navigation. Route changes
    // already remount the page component, so this adds no extra teardown.
    <div key={pathname} className="kollab-page-enter">
      <style>{`
        @keyframes kollabPageEnter {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .kollab-page-enter {
          animation: kollabPageEnter ${DURATION_MS}ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .kollab-page-enter { animation: none; }
        }
      `}</style>
      {children}
    </div>
  );
}
