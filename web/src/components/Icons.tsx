// Small inline SVG icons (no emoji as icons). Decorative by default: pass `label` to expose one to screen readers.
import type { ReactNode } from "react";

function Svg({ children, label, className = "size-5" }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

type P = { label?: string; className?: string };

export const CameraIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const UploadIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14" />
  </Svg>
);
export const PenIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" />
  </Svg>
);
export const AlertIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 4 3 20h18z" />
    <path d="M12 10v4m0 3v.01" />
  </Svg>
);
export const CrossIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9 9 6 6m0-6-6 6" />
  </Svg>
);
export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);
export const EyeIcon = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);
export const PersonIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5" />
  </Svg>
);
export const QuestionIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 9.2a3 3 0 1 1 4.6 2.5c-1 .6-1.6 1.2-1.6 2.3" />
    <path d="M12 17.5v.01" />
    <circle cx="12" cy="12" r="9" />
  </Svg>
);
export const VideoIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="m15 10 6-3v10l-6-3z" />
  </Svg>
);
export const BookIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 5.5C4 5 4.5 4.5 5 4.5H11v14H5.5C4.7 18.5 4 19 4 19.5z" />
    <path d="M20 5.5c0-.5-.5-1-1-1h-6v14h5.5c.8 0 1.5.5 1.5 1z" />
  </Svg>
);
