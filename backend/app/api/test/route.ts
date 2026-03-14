import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const users = await prisma.user.findMany()
  return Response.json(users)
}
