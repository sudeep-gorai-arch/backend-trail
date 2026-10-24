/**
 * Never authorize from a JWT alone. A token must also belong to an active
 * server-side session and to the same user as the signed JWT subject.
 */
export type SessionIdentity = {
  id: string;
  email: string;
  role?: { name: string } | null;
};

export type SessionLookup = {
  isActive: boolean;
  user: SessionIdentity | null;
} | null;

export function activeSessionIdentity(
  claims: { sub: string },
  session: SessionLookup,
): SessionIdentity | null {
  if (!session?.isActive || !session.user || session.user.id !== claims.sub) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role ?? null,
  };
}
