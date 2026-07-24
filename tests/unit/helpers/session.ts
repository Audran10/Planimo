export function fakeSession(userId: string) {
  return {
    user: { id: userId, email: `${userId}@example.com`, name: userId },
    session: { id: `session-${userId}`, userId, expiresAt: new Date() },
  }
}
