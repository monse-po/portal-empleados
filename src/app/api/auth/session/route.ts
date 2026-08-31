import { NextResponse } from "next/server";
import { getPortalUserProfile } from "@/src/server/portal-user-profile";

export async function GET() {
  const profile = await getPortalUserProfile();
  if (!profile) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...profile });
}
