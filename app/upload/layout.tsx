import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function UploadLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims } = await auth()
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/")
  }

  return children
}
