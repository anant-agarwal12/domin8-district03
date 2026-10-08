// Red-pen circle with the total, like a teacher's mark on a script.
export function ScoreStamp({ total, max }: { total: number; max: number }) {
  return (
    <div
      className="grid size-36 shrink-0 -rotate-6 place-items-center rounded-full border-[5px] border-pen text-pen sm:size-44"
      style={{ borderRadius: "52% 48% 50% 50% / 50% 52% 48% 50%" }}
      role="img"
      aria-label={`Score ${total} out of ${max}`}
    >
      <p className="font-bold tracking-tight">
        <span className="text-5xl sm:text-6xl">{total}</span>
        <span className="text-2xl sm:text-3xl"> / {max}</span>
      </p>
    </div>
  );
}
