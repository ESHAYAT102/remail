import {
  Add01Icon,
  ArchiveIcon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Attachment02Icon,
  BoldIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Clock01Icon,
  CodeIcon,
  CopyLinkIcon,
  Delete02Icon,
  Download02Icon,
  ExpandIcon,
  FileEditIcon,
  FilterHorizontalIcon,
  Forward01Icon,
  Globe02Icon,
  HelpCircleIcon,
  InboxIcon,
  InboxUnreadIcon,
  ItalicIcon,
  KeyframesMultipleRemoveIcon,
  Mail01Icon,
  MailRemove02Icon,
  Menu02Icon,
  MailsIcon,
  MinimizeIcon,
  MoreHorizontalIcon,
  Logout02Icon,
  PencilEdit02Icon,
  PinIcon,
  PaintBrush01Icon,
  PanelRightCloseIcon,
  PrinterIcon,
  Refresh01Icon,
  ReplyAllIcon,
  ReplyIcon,
  Search01Icon,
  SentIcon,
  Settings02Icon,
  Shield01Icon,
  SortByDown01Icon,
  SortByUp01Icon,
  Sorting05Icon,
  SpamIcon,
  StarIcon,
  Tag01Icon,
  TextIcon,
  StrikethroughIcon,
  Tick02Icon,
  UserIcon,
  UnderlineIcon,
} from "@hugeicons/core-free-icons";
import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react";

type IconProps = Omit<HugeiconsIconProps, "icon" | "altIcon">;

function icon(iconData: IconSvgElement) {
  return function AppIcon({ size = 24, strokeWidth = 1.5, ...props }: IconProps) {
    return (
      <HugeiconsIcon
        icon={iconData}
        size={size}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth
        aria-hidden="true"
        focusable="false"
        {...props}
      />
    );
  };
}

/**
 * One outline icon set for the whole product. Components consume this registry
 * rather than importing library glyphs directly, which keeps semantics and
 * optical weight consistent when an icon changes later.
 */
export const Icons = {
  add: icon(Add01Icon),
  previous: icon(ArrowLeft02Icon),
  next: icon(ArrowRight02Icon),
  search: icon(Search01Icon),
  collapse: icon(Menu02Icon),
  inbox: icon(InboxIcon),
  smart: icon(InboxUnreadIcon),
  sent: icon(SentIcon),
  drafts: icon(FileEditIcon),
  tag: icon(Tag01Icon),
  scheduled: icon(Clock01Icon),
  spam: icon(SpamIcon),
  archived: icon(ArchiveIcon),
  settings: icon(Settings02Icon),
  appearance: icon(PaintBrush01Icon),
  security: icon(Shield01Icon),
  help: icon(HelpCircleIcon),
  world: icon(Globe02Icon),
  compose: icon(PencilEdit02Icon),
  star: icon(StarIcon),
  pin: icon(PinIcon),
  more: icon(MoreHorizontalIcon),
  check: icon(CheckmarkCircle02Icon),
  tick: icon(Tick02Icon),
  trash: icon(Delete02Icon),
  reply: icon(ReplyIcon),
  replyAll: icon(ReplyAllIcon),
  forward: icon(Forward01Icon),
  attach: icon(Attachment02Icon),
  paperclip: icon(Attachment02Icon),
  braces: icon(CodeIcon),
  copyLink: icon(CopyLinkIcon),
  print: icon(PrinterIcon),
  expand: icon(ExpandIcon),
  unexpand: icon(MinimizeIcon),
  refresh: icon(Refresh01Icon),
  clock: icon(Clock01Icon),
  filter: icon(FilterHorizontalIcon),
  sort: icon(Sorting05Icon),
  allMail: icon(MailsIcon),
  unreadMail: icon(InboxUnreadIcon),
  mail: icon(Mail01Icon),
  logout: icon(Logout02Icon),
  newest: icon(SortByDown01Icon),
  oldest: icon(SortByUp01Icon),
  sender: icon(UserIcon),
  subject: icon(TextIcon),
  chevronDown: icon(ChevronDownIcon),
  chevronRight: icon(ChevronRightIcon),
  close: icon(Cancel01Icon),
  closeOthers: icon(KeyframesMultipleRemoveIcon),
  closeAll: icon(MailRemove02Icon),
  closeRight: icon(PanelRightCloseIcon),
  download: icon(Download02Icon),
  bold: icon(BoldIcon),
  italic: icon(ItalicIcon),
  underline: icon(UnderlineIcon),
  strikethrough: icon(StrikethroughIcon),
};
