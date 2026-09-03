import ArchiveIcon from "@hugeicons/core-free-icons/ArchiveIcon";
import Attachment02Icon from "@hugeicons/core-free-icons/Attachment02Icon";
import Briefcase02Icon from "@hugeicons/core-free-icons/Briefcase02Icon";
import Calendar01Icon from "@hugeicons/core-free-icons/Calendar01Icon";
import Camera01Icon from "@hugeicons/core-free-icons/Camera01Icon";
import ChartLineIcon from "@hugeicons/core-free-icons/ChartLineIcon";
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon";
import CodeIcon from "@hugeicons/core-free-icons/CodeIcon";
import Coffee01Icon from "@hugeicons/core-free-icons/Coffee01Icon";
import CopyLinkIcon from "@hugeicons/core-free-icons/CopyLinkIcon";
import File02Icon from "@hugeicons/core-free-icons/File02Icon";
import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon";
import HeartIcon from "@hugeicons/core-free-icons/HeartIcon";
import Home04Icon from "@hugeicons/core-free-icons/Home04Icon";
import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon";
import InboxIcon from "@hugeicons/core-free-icons/InboxIcon";
import Key01Icon from "@hugeicons/core-free-icons/Key01Icon";
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon";
import MusicNote02Icon from "@hugeicons/core-free-icons/MusicNote02Icon";
import PaintBrush01Icon from "@hugeicons/core-free-icons/PaintBrush01Icon";
import PinIcon from "@hugeicons/core-free-icons/PinIcon";
import RocketIcon from "@hugeicons/core-free-icons/RocketIcon";
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon";
import Shield01Icon from "@hugeicons/core-free-icons/Shield01Icon";
import StarIcon from "@hugeicons/core-free-icons/StarIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import Target02Icon from "@hugeicons/core-free-icons/Target02Icon";
import Task01Icon from "@hugeicons/core-free-icons/Task01Icon";
import UserIcon from "@hugeicons/core-free-icons/UserIcon";
import UserMultiple02Icon from "@hugeicons/core-free-icons/UserMultiple02Icon";
import WandSparklesIcon from "@hugeicons/core-free-icons/WandSparklesIcon";
import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react";
import type { CollectionIconName } from "@/lib/mail/collection-appearance";

const collectionIcons: Record<CollectionIconName, IconSvgElement> = {
  star: StarIcon,
  pin: PinIcon,
  clock: Clock01Icon,
  calendar: Calendar01Icon,
  inbox: InboxIcon,
  mail: Mail01Icon,
  archive: ArchiveIcon,
  tag: Tag01Icon,
  briefcase: Briefcase02Icon,
  home: Home04Icon,
  users: UserMultiple02Icon,
  user: UserIcon,
  heart: HeartIcon,
  cloud: CloudIcon,
  code: CodeIcon,
  globe: Globe02Icon,
  shield: Shield01Icon,
  key: Key01Icon,
  settings: Settings02Icon,
  brush: PaintBrush01Icon,
  camera: Camera01Icon,
  chart: ChartLineIcon,
  rocket: RocketIcon,
  target: Target02Icon,
  idea: Idea01Icon,
  coffee: Coffee01Icon,
  music: MusicNote02Icon,
  link: CopyLinkIcon,
  attachment: Attachment02Icon,
  file: File02Icon,
  task: Task01Icon,
  sparkles: WandSparklesIcon,
};

type Props = Omit<HugeiconsIconProps, "icon" | "altIcon"> & {
  name: CollectionIconName;
};

export function CollectionIcon({
  name,
  size = 16,
  strokeWidth = 1.5,
  ...props
}: Props) {
  return (
    <HugeiconsIcon
      icon={collectionIcons[name]}
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}
