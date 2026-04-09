// file: lib/utils.ts
import { differenceInDays, eachDayOfInterval, format } from 'date-fns'

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatPrice(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function calculateTotalPrice(
  pricePerNight: number,
  checkIn: Date,
  checkOut: Date
): number {
  const nights = differenceInDays(checkOut, checkIn)
  return pricePerNight * nights
}

export function getDatesInRange(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end })
}

export function formatDateRange(checkIn: Date, checkOut: Date): string {
  return `${format(checkIn, 'MMM d')} – ${format(checkOut, 'MMM d, yyyy')}`
}

export function getNights(checkIn: Date, checkOut: Date): number {
  return differenceInDays(checkOut, checkIn)
}
