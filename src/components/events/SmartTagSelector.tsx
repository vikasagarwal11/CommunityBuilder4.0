/* ------------------------------------------------------------------
 * SmartTagSelector – shows up to 10 smart-tags and lets the user
 * click one to fill the real search box (no extra filtering logic).
 * Tailwind + optional parallax-tilt for a micro-interaction touch.
 * -----------------------------------------------------------------*/
import { useState } from 'react';
import Tilt from 'react-parallax-tilt';

interface SmartTagSelectorProps {
  /** Tags in priority order (e.g. from getPersonalisedTags) */
  tags: string[];
  /** When the user clicks a pill we fill `search` in parent */
  onFillSearch: (val: string) => void;
}

export default function SmartTagSelector({
  tags,
  onFillSearch,
}: SmartTagSelectorProps) {
  const [term, setTerm] = useState('');

  const visible = tags
    .filter((t) => t.toLowerCase().includes(term.toLowerCase()))
    .slice(0, 10);

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <input
        type="text"
        placeholder="Filter tags…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="border border-neutral-300 rounded-full px-4 py-1 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-400"
      />

      {visible.map((tag) => (
        <Tilt key={tag} tiltMaxAngleX={4} tiltMaxAngleY={4} glareEnable={false}>
          <button
            onClick={() => onFillSearch(tag)}
            className="px-4 py-1 rounded-full text-sm whitespace-nowrap transition
                       bg-neutral-100 text-neutral-800 hover:bg-primary-500
                       hover:text-white"
          >
            {tag}
          </button>
        </Tilt>
      ))}
    </div>
  );
}
