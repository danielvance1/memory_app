import { useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth";
import CodeSection, { COLUMNS, GAP } from "../components/CodeSection";
import { useAreaSize } from "../useAreaSize";

// Tiles never get bigger than this, even on a wide screen.
const MAX_TILE_SIZE = 64;

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
// headers. For now they are all unset because codes can't be saved yet.
// Tapping one opens it in the Edit tab.
export default function AllCodesPage() {
  const areaRef = useRef<HTMLElement>(null);
  const { width } = useAreaSize(areaRef);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tapping a tile opens the Edit tab on that code (the code rides in the address).
  const openInEditor = useCallback((digits: string) => navigate(`/codes/edit?code=${digits}`), [navigate]);

  // Ten tiles and nine gaps have to fit across the page, so the tile is a tenth of what's left.
  const tileSize = Math.min(MAX_TILE_SIZE, Math.floor((width - (COLUMNS - 1) * GAP) / COLUMNS));
  const sections = user ? sectionsFor(user.codeSystem) : [];

  return (
    <section ref={areaRef} aria-label="All codes" className="flex flex-col gap-8">
      {/* Wait for the first measurement so the tiles are built at the right size once. */}
      {tileSize > 0 &&
        sections.map((s) => (
          <CodeSection
            key={s.title}
            title={s.title}
            start={s.start}
            count={s.count}
            digitWidth={s.digitWidth}
            tileSize={tileSize}
            onSelect={openInEditor}
          />
        ))}
    </section>
  );
}
