'use client'
// file: components/BookingWidget.tsx
import { useState, useEffect } from 'react'
import { DateRangePicker } from './DateRangePicker'
import { formatPrice, calculateTotalPrice, getNights } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { format, isBefore, startOfDay } from 'date-fns'

type Listing = {
  id: string
  slug: string
  title: string
  pricePerNight: number
  capacity: number
}

type Session = any

export function BookingWidget({
  listing,
  session,
}: {
  listing: Listing
  session: Session | null
}) {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [guests, setGuests] = useState(1)
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])
  const [step, setStep] = useState<'dates' | 'details' | 'loading'>('dates')
  const [error, setError] = useState('')

  const [guestName, setGuestName] = useState(session?.user?.name || '')
  const [guestEmail, setGuestEmail] = useState(session?.user?.email || '')
  const [guestPhone, setGuestPhone] = useState('')
  const [notes, setNotes] = useState('')

  const nights = checkIn && checkOut ? getNights(checkIn, checkOut) : 0
  const total = checkIn && checkOut ? calculateTotalPrice(listing.pricePerNight, checkIn, checkOut) : 0

  useEffect(() => {
    fetch(`/api/listings/${listing.slug}/availability`)
      .then((r) => r.json())
      .then((dates: string[]) => setUnavailableDates(dates.map((d) => new Date(d))))
      .catch(() => {})
  }, [listing.slug])

  async function handleBook() {
    if (!session) {
      router.push(`/login?callbackUrl=/listings/${listing.slug}`)
      return
    }

    if (!checkIn || !checkOut || !guestName || !guestEmail) {
      setError('Please fill in all required fields')
      return
    }

    setStep('loading')
    setError('')

    try {
      // 1. Create booking
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          guests,
          guestName,
          guestEmail,
          guestPhone,
          notes,
        }),
      })

      if (!bookingRes.ok) {
        const data = await bookingRes.json()
        setError(data.error || 'Booking failed')
        setStep('details')
        return
      }

      const booking = await bookingRes.json()

      // 2. Create Stripe checkout session
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })

      if (!checkoutRes.ok) {
        setError('Payment setup failed')
        setStep('details')
        return
      }

      const { url } = await checkoutRes.json()
      window.location.href = url
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setStep('details')
    }
  }

  const isDateUnavailable = (date: Date) => {
    const today = startOfDay(new Date())
    if (isBefore(date, today)) return true
    return unavailableDates.some(
      (u) => format(u, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    )
  }

  return (
    <div className="card p-6">
      {/* Price header */}
      <div className="mb-5 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold text-gray-900">
          {formatPrice(listing.pricePerNight)}
        </span>
        <span className="text-gray-400">/ night</span>
      </div>

      {/* Step: dates */}
      {(step === 'dates' || step === 'details') && (
        <>
          <DateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => { setCheckIn(ci); setCheckOut(co) }}
            isDateUnavailable={isDateUnavailable}
          />

          {/* Guests */}
          <div className="mt-3">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Guests</label>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
              <button
                onClick={() => setGuests(Math.max(1, guests - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                −
              </button>
              <span className="flex-1 text-center font-semibold">{guests}</span>
              <button
                onClick={() => setGuests(Math.min(listing.capacity, guests + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">Max {listing.capacity} guests</p>
          </div>
        </>
      )}

      {/* Step: guest details */}
      {step === 'details' && checkIn && checkOut && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-700">Your details</p>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <input
            placeholder="Full name *"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="input-field"
          />
          <input
            placeholder="Email *"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="input-field"
          />
          <input
            placeholder="Phone (optional)"
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="input-field"
          />
          <textarea
            placeholder="Special requests (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input-field resize-none"
          />
        </div>
      )}

      {/* Loading */}
      {step === 'loading' && (
        <div className="flex flex-col items-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ocean-600 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Redirecting to payment…</p>
        </div>
      )}

      {/* Price breakdown */}
      {nights > 0 && step !== 'loading' && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatPrice(listing.pricePerNight)} × {nights} night{nights > 1 ? 's' : ''}</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      )}

      {/* CTA button */}
      {step !== 'loading' && (
        <>
          {step === 'dates' && checkIn && checkOut ? (
            <button
              onClick={() => setStep('details')}
              className="btn-coral mt-4 w-full py-3.5"
            >
              Continue — {nights} night{nights > 1 ? 's' : ''}
            </button>
          ) : step === 'dates' ? (
            <button
              disabled
              className="btn-coral mt-4 w-full py-3.5 opacity-50 cursor-not-allowed"
            >
              Select dates to continue
            </button>
          ) : (
            <button
              onClick={handleBook}
              className="btn-coral mt-4 w-full py-3.5"
            >
              {session ? '🔒 Pay now' : 'Sign in to book'}
            </button>
          )}
        </>
      )}

      <p className="mt-3 text-center text-xs text-gray-400">
        You won&apos;t be charged yet — review on the next page
      </p>
    </div>
  )
}
