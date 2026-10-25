import { ApiError } from '../utils/ApiError';

/**
 * Guests get UUID identifiers from the Android app. Reject oversized, invalid
 * or arbitrary guest IDs before they can create database records.
 */
export const validatedGuestId = (value: string | undefined): string | null => {
  if (!value) return null;
  const guestId = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestId)) {
    throw ApiError.badRequest('Invalid guest ID.');
  }
  return guestId.toLowerCase();
};
