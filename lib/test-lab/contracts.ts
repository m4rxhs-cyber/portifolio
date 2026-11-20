import { z } from 'zod';

const date = z.iso.date();
export const bookingDates = z.object({ checkin: date, checkout: date });
export const booking = z.object({
  firstname: z.string().min(1), lastname: z.string().min(1), totalprice: z.number().int().nonnegative(),
  depositpaid: z.boolean(), bookingdates: bookingDates, additionalneeds: z.string().optional(),
});
export const bookingId = z.number().int().positive().safe();
export const bookingIdentifier = z.object({ bookingid: bookingId });
export const createdBooking = bookingIdentifier.extend({ booking });
export const bookingList = z.array(bookingIdentifier);
export type Booking = z.infer<typeof booking>;
