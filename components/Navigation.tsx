"use client"

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SignInButton, SignOutButton, SignUpButton, Show } from "@clerk/nextjs";
import { Button } from "./ui/button";

const links = [
  { href: "/chat", label: "Chat" },
  { href: "/upload", label: "Upload" },
];

export const Navigation = () => {
  const pathname = usePathname();

  return (
        <nav className="border-b border-(--foreground)/10">
      <div className="flex container h-12 items-center justify-between px-4  mx-auto">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-xl font-semibold">RAG Chatbot</div>

          <Show when="signed-in">
            <div className="flex gap-1">
              {links.map((link) => (
                <Button
                  key={link.href}
                  variant={pathname === link.href ? "secondary" : "ghost"}
                  nativeButton={false}
                  render={<Link href={link.href} />}
                >
                  {link.label}
                </Button>
              ))}
            </div>
          </Show>
        </div>

        <div className="flex gap-2">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>Sign Up</Button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <SignOutButton>
              <Button variant="outline">Sign Out</Button>
            </SignOutButton>
          </Show>
        </div>
      </div>
    </nav>
  )
}
