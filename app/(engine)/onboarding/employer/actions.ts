"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { employerProfiles } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { employerProfileSchema } from "@/lib/validation";
import { str, withError } from "@/lib/forms";

export async function saveEmployerProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in?intent=employer");

  const parsed = employerProfileSchema.safeParse({
    organizationName: str(formData, "organizationName"),
    organizationType: str(formData, "organizationType"),
    city: str(formData, "city"),
    region: str(formData, "region"),
    contactName: str(formData, "contactName"),
    ghanaCardLast4: str(formData, "ghanaCardLast4") || undefined,
    businessRegistrationNumber:
      str(formData, "businessRegistrationNumber") || undefined,
    description: str(formData, "description") || undefined,
  });

  if (!parsed.success) {
    redirect(
      withError(
        "/onboarding/employer",
        parsed.error.issues[0]?.message ?? "Please check the form.",
      ),
    );
  }

  const data = parsed.data;
  const db = getDb();

  await db
    .insert(employerProfiles)
    .values({
      userId: session.userId!,
      organizationName: data.organizationName,
      organizationType: data.organizationType,
      city: data.city,
      region: data.region,
      contactName: data.contactName,
      ghanaCardLast4: data.ghanaCardLast4,
      businessRegistrationNumber: data.businessRegistrationNumber,
      description: data.description,
    })
    .onConflictDoUpdate({
      target: employerProfiles.userId,
      set: {
        organizationName: data.organizationName,
        organizationType: data.organizationType,
        city: data.city,
        region: data.region,
        contactName: data.contactName,
        ghanaCardLast4: data.ghanaCardLast4,
        businessRegistrationNumber: data.businessRegistrationNumber,
        description: data.description,
        updatedAt: new Date(),
      },
    });

  // Refresh updatedAt on user as a sign-of-life signal.
  await db
    .update(employerProfiles)
    .set({ updatedAt: new Date() })
    .where(eq(employerProfiles.userId, session.userId!));

  redirect("/employer");
}
