import type { SVGProps } from "react";

export type IconName =
  | "arrow"
  | "activity"
  | "chart"
  | "check"
  | "chevron"
  | "close"
  | "compass"
  | "dashboard"
  | "download"
  | "menu"
  | "message"
  | "more"
  | "plan"
  | "plus"
  | "refresh"
  | "resource"
  | "review"
  | "search"
  | "settings"
  | "spark"
  | "upload"
  | "warning";

const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  activity: <><path d="M4 18V9" /><path d="M10 18V5" /><path d="M16 18v-7" /><path d="M22 18V3" /></>,
  chart: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-8" /><path d="M22 19V2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  message: <><path d="M21 14a4 4 0 0 1-4 4H9l-6 3 2-6a7 7 0 0 1-2-5c0-4 4-7 9-7s9 3 9 7v4Z" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  plan: <><path d="M4 20V5a2 2 0 0 1 2-2h11l3 3v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  refresh: <><path d="M20 6v6h-6" /><path d="M4 18v-6h6" /><path d="M19 12a7 7 0 0 0-12-5L4 10M5 12a7 7 0 0 0 12 5l3-3" /></>,
  resource: <><path d="M4 8h16v12H4z" /><path d="M8 8V4h8v4M4 13h16" /></>,
  review: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6M9 7h3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7-.8-1.8.9-1.9-2.2-2.2-1.9.9-1.8-.8-.7-2h-3l-.7 2-1.8.8-1.9-.9L.9 6.1 1.8 8 1 9.8l-2 .7v3l2 .7.8 1.8-.9 1.9 2.2 2.2 1.9-.9 1.8.8.7 2h3l.7-2 1.8-.8 1.9.9 2.2-2.2-.9-1.9.8-1.8 2-.7Z" transform="translate(2)" /></>,
  spark: <><path d="m12 2 1.4 5.1L18 9l-4.6 1.9L12 16l-1.4-5.1L6 9l4.6-1.9L12 2Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></>,
  upload: <><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M4 3h16" /></>,
  warning: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
