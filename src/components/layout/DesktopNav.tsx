"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type DesktopNavProps = {
  role: "teacher" | "admin";
  onSignOut: () => void;
};

const teacherNavItems: NavItem[] = [
  { href: "/dashboard", label: "Exams" },
  { href: "/exams/new", label: "New Exam" },
];

const adminNavItems: NavItem[] = [
  { href: "/dashboard", label: "Exams" },
  { href: "/admin/exams", label: "All Exams" },
  { href: "/admin/template", label: "Template" },
  { href: "/admin/teachers", label: "Teachers" },
];

export function DesktopNav({ role, onSignOut }: DesktopNavProps) {
  const pathname = usePathname();
  const items = role === "admin" ? adminNavItems : teacherNavItems;

  return (
    <nav className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-neutral-200 md:bg-white">
      <div className="flex h-16 items-center px-6 border-b border-neutral-200">
        <Link href="/dashboard" className="text-lg font-semibold text-primary-700">
          Scribe
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-neutral-200 p-3">
        <button
          onClick={onSignOut}
          className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
