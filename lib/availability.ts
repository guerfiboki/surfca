// file: lib/availability.ts
import { prisma } from '@/lib/prisma'
import { eachDayOfInterval, isSameDay } from 'date-fns'

export async function getUnavailableDates(listingId: string): Promise<Date[]> {
  const [bookings, blockedDates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        listingId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { checkIn: true, checkOut: true },
    }),
    prisma.blockedDate.findMany({
      where: { listingId },
      select: { date: true },
    }),
  ])

  const bookedDays: Date[] = []

  for (const booking of bookings) {
    const days = eachDayOfInterval({
      start: booking.checkIn,
      end: booking.checkOut,
    })
    bookedDays.push(...days)
  }

  const blocked = blockedDates.map((b) => b.date)

  return [...bookedDays, ...blocked]
}

export async function isAvailable(
  listingId: string,
  checkIn: Date,
  checkOut: Date
): Promise<boolean> {
  const requestedDays = eachDayOfInterval({ start: checkIn, end: checkOut })
  const unavailable = await getUnavailableDates(listingId)

  return !requestedDays.some((day) =>
    unavailable.some((u) => isSameDay(u, day))
  )
}
