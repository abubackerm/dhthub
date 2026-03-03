"use client";

import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

// Map icon name string to lucide-react component
const iconMap: Record<string, React.ComponentType<LucideProps>> = {
    Wrench: LucideIcons.Wrench,
    Bolt: LucideIcons.Hammer,
    Minus: LucideIcons.Minus,
    CircleDot: LucideIcons.CircleDot,
    Undo2: LucideIcons.Undo2,
    CornerDownRight: LucideIcons.CornerDownRight,
    Hexagon: LucideIcons.Hexagon,
    Circle: LucideIcons.Circle,
    Pin: LucideIcons.Pin,
    Anchor: LucideIcons.Anchor,
    ScrewIcon: LucideIcons.Settings,
    Settings: LucideIcons.Settings,
    Disc: LucideIcons.Disc,
    Layers: LucideIcons.Layers,
    Scissors: LucideIcons.Scissors,
    Sparkles: LucideIcons.Sparkles,
    Brush: LucideIcons.Paintbrush,
    Factory: LucideIcons.Factory,
    Square: LucideIcons.Square,
    Flame: LucideIcons.Flame,
    Paperclip: LucideIcons.Paperclip,
    Zap: LucideIcons.Zap,
    Cable: LucideIcons.Cable,
    Plug: LucideIcons.Plug,
    ShieldCheck: LucideIcons.ShieldCheck,
    ToggleRight: LucideIcons.ToggleRight,
    Grid3x3: LucideIcons.Grid3x3,
    Cog: LucideIcons.Cog,
    RotateCcw: LucideIcons.RotateCcw,
    Link: LucideIcons.Link,
    Gauge: LucideIcons.Gauge,
    Cylinder: LucideIcons.Cylinder,
    GitBranch: LucideIcons.GitBranch,
    Waves: LucideIcons.Waves,
    Settings2: LucideIcons.Settings2,
    Package: LucideIcons.Package,
    FolderOpen: LucideIcons.FolderOpen,
};

interface CategoryIconProps extends LucideProps {
    iconName?: string;
}

export function CategoryIcon({ iconName, ...props }: CategoryIconProps) {
    const IconComponent = iconName ? iconMap[iconName] : null;

    if (IconComponent) {
        return <IconComponent {...props} />;
    }

    // Fallback
    return <LucideIcons.Package {...props} />;
}
