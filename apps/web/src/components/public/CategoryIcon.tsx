"use client";

import {
  Wrench,
  Hammer,
  Minus,
  CircleDot,
  Undo2,
  CornerDownRight,
  Hexagon,
  Circle,
  Pin,
  Anchor,
  Settings,
  Disc,
  Layers,
  Scissors,
  Sparkles,
  Paintbrush,
  Factory,
  Square,
  Flame,
  Paperclip,
  Zap,
  Cable,
  Plug,
  ShieldCheck,
  ToggleRight,
  Grid3x3,
  Cog,
  RotateCcw,
  Link,
  Gauge,
  Cylinder,
  GitBranch,
  Waves,
  Settings2,
  Package,
  FolderOpen,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Wrench,
  Bolt: Hammer,
  Minus,
  CircleDot,
  Undo2,
  CornerDownRight,
  Hexagon,
  Circle,
  Pin,
  Anchor,
  ScrewIcon: Settings,
  Settings,
  Disc,
  Layers,
  Scissors,
  Sparkles,
  Brush: Paintbrush,
  Factory,
  Square,
  Flame,
  Paperclip,
  Zap,
  Cable,
  Plug,
  ShieldCheck,
  ToggleRight,
  Grid3x3,
  Cog,
  RotateCcw,
  Link,
  Gauge,
  Cylinder,
  GitBranch,
  Waves,
  Settings2,
  Package,
  FolderOpen,
};

interface CategoryIconProps extends LucideProps {
  iconName?: string;
}

export function CategoryIcon({ iconName, ...props }: CategoryIconProps) {
  const IconComponent = iconName ? iconMap[iconName] : null;

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  return <Package {...props} />;
}
