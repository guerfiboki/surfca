// file: app/admin/bookings/page.tsx
import { prisma } from '@/lib/prisma'
import { formatPrice, formatDateRange } from '@/lib/utils'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  COMPLETED: 'bg-gray-100 text-gray-600',
}

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { listing: true, user: true, payment: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="font-display mb-8 text-3xl font-bold text-gray-900">All Bookings</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Guest', 'Listing', 'Dates', 'Guests', 'Total', 'Payment', 'Status', 'Created'].map(
                (h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <p className="font-semibold text-gray-900">{b.guestName}</p>
                  <p className="text-gray-400">{b.guestEmail}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-gray-900">{b.listing.title}</p>
                  <p className="text-gray-400">{b.listing.location}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                  {formatDateRange(b.checkIn, b.checkOut)}
                </td>
                <td className="px-4 py-4 text-gray-600">{b.guests}</td>
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-900">
                  {formatPrice(b.totalPrice)}
                </td>
                <td className="px-4 py-4">
                  {b.payment ? (
                    <span className={`badge text-xs ${
                      b.payment.status === 'PAID'
                        ? 'bg-green-100 text-green-700'
                        : b.payment.status === 'FAILED'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {b.payment.status}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className={`badge text-xs ${statusColors[b.status]}`}>
                    {b.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-400">
                  {format(b.createdAt, 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
