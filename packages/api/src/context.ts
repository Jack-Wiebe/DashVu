export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  hasSpotify?: boolean;
  hasCalendar?: boolean;
}

export interface Context {
  session: { user: SessionUser } | null;
}
