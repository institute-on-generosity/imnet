import { Brain, Globe, GraduationCap, HeartPulse, House, Leaf, Palette, PawPrint, Sprout, Utensils, type LucideIcon } from "lucide-react"

// One icon per cause (F-088), for cause cards and chips.
export const CAUSE_ICON: Record<string, LucideIcon> = {
  hunger: Utensils, housing: House, education: GraduationCap, health: HeartPulse, environment: Leaf,
  youth: Sprout, animals: PawPrint, arts: Palette, refugees: Globe, "mental-health": Brain,
}
