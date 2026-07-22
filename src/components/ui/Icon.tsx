import {
  AlertCircle,
  ArrowLeft,
  Ban,
  BarChart3,
  Briefcase,
  BriefcaseMedical,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Flag,
  FolderOpen,
  History,
  Hourglass,
  Info,
  Menu,
  Moon,
  MapPin,
  Paperclip,
  Pencil,
  Plane,
  Plus,
  PlusCircle,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  SquareCheck,
  Sun,
  Star,
  TriangleAlert,
  Undo2,
  User,
  UserCircle,
  Wallet,
  X,
  type LucideProps,
} from "lucide-react";

export const ICONS = {
  alertCircle: AlertCircle,
  arrowLeft: ArrowLeft,
  barChart: BarChart3,
  ban: Ban,
  briefcase: Briefcase,
  calendar: Calendar,
  check: Check,
  checkSquare: SquareCheck,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  circleCheck: CheckCircle2,
  clock: Clock,
  copy: Copy,
  flag: Flag,
  filter: SlidersHorizontal,
  folderOpen: FolderOpen,
  history: History,
  hourglass: Hourglass,
  incapacidad: BriefcaseMedical,
  info: Info,
  menu: Menu,
  moon: Moon,
  mapPin: MapPin,
  paperclip: Paperclip,
  pencil: Pencil,
  plane: Plane,
  plus: Plus,
  plusCircle: PlusCircle,
  search: Search,
  send: Send,
  shieldCheck: ShieldCheck,
  star: Star,
  sun: Sun,
  triangleAlert: TriangleAlert,
  undo: Undo2,
  user: User,
  userCircle: UserCircle,
  wallet: Wallet,
  x: X,
} as const;

export type IconName = keyof typeof ICONS;

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClass: Record<IconSize, string> = {
  xs: "size-icon-xs",
  sm: "size-icon-sm",
  md: "size-icon-md",
  lg: "size-icon-lg",
  xl: "size-icon-xl",
};

export type IconProps = {
  name: IconName;
  size?: IconSize;
  className?: string;
} & Omit<LucideProps, "size">;

export function Icon({
  name,
  size = "md",
  className = "",
  strokeWidth,
  ...props
}: IconProps) {
  const LucideComponent = ICONS[name];
  return (
    <LucideComponent
      className={`${sizeClass[size]} shrink-0 ${className}`.trim()}
      strokeWidth={strokeWidth ?? 1.75}
      aria-hidden={props["aria-hidden"] ?? true}
      {...props}
    />
  );
}
