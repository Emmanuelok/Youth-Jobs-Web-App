import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    session.destroy();
  } catch {
    // session secret missing — nothing to destroy
  }
  const url = new URL("/", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
