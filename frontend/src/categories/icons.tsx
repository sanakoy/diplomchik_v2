import {
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Coins,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PawPrint,
  Percent,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { resolveIcon, type IconKey } from './icon-keys'

// Картинка и подпись для скринридера у каждого ключа
export const ICONS: Record<IconKey, { Icon: LucideIcon; label: string }> = {
  'shopping-cart': { Icon: ShoppingCart, label: 'Корзина' },
  utensils: { Icon: Utensils, label: 'Вилка и нож' },
  coffee: { Icon: Coffee, label: 'Чашка' },
  bus: { Icon: Bus, label: 'Автобус' },
  car: { Icon: Car, label: 'Машина' },
  fuel: { Icon: Fuel, label: 'Заправка' },
  house: { Icon: House, label: 'Дом' },
  zap: { Icon: Zap, label: 'Молния' },
  smartphone: { Icon: Smartphone, label: 'Телефон' },
  wifi: { Icon: Wifi, label: 'Интернет' },
  shirt: { Icon: Shirt, label: 'Футболка' },
  'heart-pulse': { Icon: HeartPulse, label: 'Сердце' },
  pill: { Icon: Pill, label: 'Таблетка' },
  dumbbell: { Icon: Dumbbell, label: 'Гантель' },
  'gamepad-2': { Icon: Gamepad2, label: 'Геймпад' },
  film: { Icon: Film, label: 'Плёнка' },
  tv: { Icon: Tv, label: 'Телевизор' },
  gift: { Icon: Gift, label: 'Подарок' },
  'graduation-cap': { Icon: GraduationCap, label: 'Шапочка выпускника' },
  'book-open': { Icon: BookOpen, label: 'Книга' },
  baby: { Icon: Baby, label: 'Ребёнок' },
  'paw-print': { Icon: PawPrint, label: 'Лапа' },
  plane: { Icon: Plane, label: 'Самолёт' },
  scissors: { Icon: Scissors, label: 'Ножницы' },
  wrench: { Icon: Wrench, label: 'Гаечный ключ' },
  receipt: { Icon: Receipt, label: 'Чек' },
  briefcase: { Icon: Briefcase, label: 'Портфель' },
  laptop: { Icon: Laptop, label: 'Ноутбук' },
  'piggy-bank': { Icon: PiggyBank, label: 'Копилка' },
  percent: { Icon: Percent, label: 'Процент' },
  coins: { Icon: Coins, label: 'Монеты' },
  'trending-up': { Icon: TrendingUp, label: 'График роста' },
  wallet: { Icon: Wallet, label: 'Кошелёк' },
  tag: { Icon: Tag, label: 'Ярлык' },
}

interface CategoryIconProps {
  category: { icon?: string | null; name: string }
  className?: string
}

/** Иконка категории. Декоративная: рядом всегда есть название. */
export function CategoryIcon({ category, className }: CategoryIconProps) {
  const { Icon } = ICONS[resolveIcon(category)]
  return <Icon aria-hidden="true" className={className} />
}
