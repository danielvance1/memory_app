import { useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth";
import { useCodes } from "../codes";
import CodeSection from "../components/CodeSection";
import CodesGate from "../components/CodesGate";
import { allCodesTileSize } from "../tileSizing";
import { useAreaSize } from "../useAreaSize";

// Room kept free under the last section (matches the `pb-4` on the page below).
const BOTTOM_PADDING = 16;

interface Section {
  title: string;
  start: number;
  count: number;
  digitWidth: number;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

// Which groups of codes to show for a code system. Each system includes the
// ones before it: system 2 = single + double digits, system 3 adds a section
// for every hundred (000-099, 100-199, ... 900-999).
function sectionsFor(codeSystem: number): Section[] {
  const sections: Section[] = [];
  if (codeSystem >= 1) {
    sections.push({ title: "Single digits: 0-9", start: 0, count: 10, digitWidth: 1 });
  }
  if (codeSystem >= 2) {
    sections.push({ title: "Double digits: 00-99", start: 0, count: 100, digitWidth: 2 });
  }
  if (codeSystem >= 3) {
    for (let hundred = 0; hundred < 10; hundred++) {
      const start = hundred * 100;
      sections.push({
        title: `Triple digits: ${pad(start, 3)}-${pad(start + 99, 3)}`,
        start,
        count: 100,
        digitWidth: 3,
      });
    }
  }
  return sections;
}

// "All Codes" sub-tab: every code in the user's code system, grouped under
// headers. Codes the user has set are drawn as set. Tapping one opens it in the Edit tab.
//
// Nothing scrolls on the 1 and 2 digit systems: the tiles are sized so every
// section fits the screen. From the 3 digit system up there are too many tiles
// for that, so this area scrolls on its own while the page stays put.
export default function AllCodesPage() {
  const areaRef = useRef<HTMLElement>(null);
  const { width, height } = useAreaSize(areaRef);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isSet } = useCodes();

  // Tapping a tile opens the Edit tab on that code (the code rides in the address).
  const openInEditor = useCallback((digits: string) => navigate(`/codes/edit?code=${digits}`), [navigate]);

  const system = user?.codeSystem ?? 1;
  const tileSize = allCodesTileSize(width, Math.max(0, height - BOTTOM_PADDING), system);
  const sections = user ? sectionsFor(user.codeSystem) : [];

  return (
    <section ref={areaRef} aria-label="All codes" className="-mx-1 flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-1 pb-4">
      {/* Wait for the first measurement so the tiles are built at the right size once,
          and for the user's codes, so no tile flips from "not set" to "set" after appearing. */}
      {tileSize > 0 && (
        <CodesGate>
          {sections.map((s) => (
            <CodeSection
              key={s.title}
              title={s.title}
              start={s.start}
              count={s.count}
              digitWidth={s.digitWidth}
              tileSize={tileSize}
              scrollBox={areaRef}
              isSet={isSet}
              onSelect={openInEditor}
            />
          ))}
        </CodesGate>
      )}
    </section>
  );
}
