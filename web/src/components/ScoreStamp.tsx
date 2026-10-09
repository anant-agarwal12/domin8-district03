// A teacher's red-pen circle around the total. The stroke draws itself once, unless reduced motion is on.
export function ScoreStamp({ total, max }: { total: number; max: number }) {
  return (
    <div
      className="relative grid size-40 shrink-0 place-items-center text-pen sm:size-48"
      role="img"
      aria-label={`Score ${total} out of ${max}`}
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-6" aria-hidden fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round">
        <path
          className="draw-once"
          pathLength={1}
          d="M100 12C160 10 192 52 188 104C184 158 140 192 92 188C40 184 10 146 14 94C18 44 56 14 112 16C128 17 142 22 150 28"
        />
      </svg>
      <p className="hand relative tnum">
        <span className="text-6xl sm:text-7xl">{total}</span>
        <span className="text-3xl sm:text-4xl"> / {max}</span>
      </p>
    </div>
  );
}
