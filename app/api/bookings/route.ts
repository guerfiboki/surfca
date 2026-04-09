// file: app/api/bookings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAvailable } from '@/lib/availability'
import { calculateTotalPrice } from '@/lib/utils'
import { z } from 'zod'

const bookingSchema = z.object({
  listingId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().positive(),
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Please log in to book' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = bookingSchema.parse(body)

    const checkIn = new Date(data.checkIn)
    const checkOut = new Date(data.checkOut)

    if (checkIn >= checkOut) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
    }

    const listing = await prisma.listing.findUnique({
      where: { id: data.listingId },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (data.guests > listing.capacity) {
      return NextResponse.json({ error: 'Too many guests' }, { status: 400 })
    }

    const available = await isAvailable(listing.id, checkIn, checkOut)
    if (!available) {
      return NextResponse.json(
        { error: 'These dates are not available' },
        { status: 409 }
      )
    }

    const totalPrice = calculateTotalPrice(listing.pricePerNight, checkIn, checkOut)

    const booking = await prisma.booking.create({
      data: {
        listingId: listing.id,
        userId: (session.user as any).id,
        checkIn,
        checkOut,
        guests: data.guests,
        totalPrice,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        notes: data.notes,
        status: 'PENDING',
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Invalid booking data' }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const isAdmin = (session.user as any).role === 'ADMIN'

  const bookings = await prisma.booking.findMany({
    where: isAdmin ? {} : { userId },
    include: { listing: true, payment: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bookings)
}
