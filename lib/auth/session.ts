import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type Session = {
  userId?: string;
  role?: "candidate" | "employer" | "admin";
  isUnder18?: boolean;
};

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "",
  cookieName: "gyj_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a string of at least 32 characters.",
    );
  }
  return getIronSession<Session>(await cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return session as Required<Session>;
}
