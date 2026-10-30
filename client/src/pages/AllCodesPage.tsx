import { useRef, useState } from "react";
import CodeComponent from "../components/CodeComponent";
import { useAreaSize } from "../useAreaSize";

// The tile may use at most this share of the sub-tab's height, so there is
// room below it for the content coming in the next ticket.
const MAX_TILE_SHARE = 0.25;

// "All Codes" sub-tab. The top of the screen shows the next code the user
// needs to define. For now that is a fixed placeholder (174) and tapping it
// just flips it between set and unset so both looks can be reviewed.
export default function AllCodesPage() {
  const areaRef = useRef<HTMLElement>(null);
  const { width, height } = useAreaSize(areaRef);
  const [isSet, setIsSet] = useState(false);

  // Square, so one number: no taller than 25% of the area and no wider than the area.
  const tileSize = Math.floor(Math.min(height * MAX_TILE_SHARE, width));

  return (
    <section ref={areaRef} aria-label="All codes" className="flex flex-col items-center">
      {/* Hold the space (even before measuring) so the page doesn't jump. */}
      <div className="flex items-end justify-center" style={{ height: tileSize }}>
        {tileSize > 0 && <CodeComponent digits="174" isSet={isSet} size={tileSize} onClick={() => setIsSet((v) => !v)} />}
      </div>
    </section>
  );
}
