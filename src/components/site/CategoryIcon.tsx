import {
  AppWindow,
  Baby,
  Car,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Laptop,
  PawPrint,
  Plane,
  Shirt,
  ShoppingBag,
  Sofa,
  Sparkles,
  Tag,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Shirt,
  Laptop,
  Sofa,
  Sparkles,
  Plane,
  Dumbbell,
  AppWindow,
  UtensilsCrossed,
  ShoppingBag,
  Gift,
  Heart,
  Baby,
  PawPrint,
  Car,
  Gamepad2,
  GraduationCap,
  Wallet,
  Tag,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || Tag;
  return <Icon className={className} />;
}
