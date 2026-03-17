// Maps category names to appropriate Lucide icon names based on keywords

const ICON_MAPPINGS: Record<string, string> = {
  // Fasteners
  bolt: 'Bolt',
  screw: 'Settings',
  nut: 'Hexagon',
  washer: 'Circle',
  pin: 'Pin',
  anchor: 'Anchor',
  stud: 'Minus',
  rod: 'Minus',
  u: 'Undo2',
  fastener: 'Wrench',
  'socket-head': 'Settings',
  'cap-screw': 'Settings',
  'socket head': 'Settings',
  
  // Power transmission
  clutch: 'CircleDot',
  brake: 'Square',
  torque: 'Gauge',
  limiter: 'ShieldCheck',
  transmission: 'Cog',
  gear: 'Cog',
  bearing: 'Circle',
  belt: 'Link',
  pulley: 'Circle',
  chain: 'Link',
  sprocket: 'Cog',
  motor: 'Gauge',
  drive: 'Gauge',
  shaft: 'Minus',
  'd-profile': 'Square',
  magnetic: 'Zap',
  
  // Materials
  material: 'Layers',
  raw: 'Layers',
  aluminum: 'Square',
  steel: 'Square',
  bar: 'Minus',
  sheet: 'Square',
  metal: 'Square',
  pipe: 'Cylinder',
  tubing: 'Cylinder',
  tube: 'Cylinder',
  hose: 'Waves',
  fitting: 'GitBranch',
  
  // General categories
  electrical: 'Zap',
  wire: 'Cable',
  cable: 'Cable',
  connector: 'Plug',
  switch: 'ToggleRight',
  relay: 'ToggleRight',
  valve: 'Settings2',
  
  // Fallback
  default: 'Package',
};

export function getCategoryIconName(categoryName: string): string {
  const lowerName = categoryName.toLowerCase();
  
  // Check for exact matches first
  if (ICON_MAPPINGS[lowerName]) {
    return ICON_MAPPINGS[lowerName];
  }
  
  // Check for keyword matches
  for (const [keyword, iconName] of Object.entries(ICON_MAPPINGS)) {
    if (lowerName.includes(keyword) && keyword !== 'default') {
      return iconName;
    }
  }
  
  // Default fallback
  return ICON_MAPPINGS.default;
}
