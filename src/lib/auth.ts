import { auth, currentUser } from "@clerk/nextjs/server";

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function getAuthUser() {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? "",
    name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    image: user.imageUrl,
  };
}
