import { getAuthUserId, getAuthUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getSessionUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      image: authUser.image,
    });
  }

  return { userId: authUser.id, user: authUser };
}
