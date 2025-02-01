"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  ForwardIcon,
  AtSymbolIcon,
} from "@heroicons/react/24/outline";
import cn from "@/utils/cn";
import linkcalLogo from "@/public/linkcal.svg";
import UserMenu from "../Navbar/UserMenu";
import { createClient } from "@/utils/supabase/client";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";

// Reusable navigation link component
const NavLink = ({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg text-sm transition-all duration-300 ease-in-out",
        "hover:bg-overlay-10 hover:text-white",
        isActive ? "bg-overlay-10 text-white" : "text-white/70"
      )}
    >
      <Icon
        className={cn(
          "w-4 transition-all duration-300 ease-in-out",
          isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
        )}
      />
      {children}
    </Link>
  );
};

// Reusable loading skeleton component
const SkeletonLoader = ({ className }: { className: string }) => (
  <motion.div
    className={cn("animate-pulse bg-overlay-10 rounded", className)}
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  />
);

// Custom hook for data fetching
const useUserData = () => {
  return useQuery({
    queryKey: ["userAndAccounts"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.user_metadata?.full_name || user.email || ""
        )}&size=128&background=random&rounded=true`;

      return {
        user: {
          name: user.user_metadata?.full_name || user.email || "",
          email: user.email || "",
          imageUrl: avatarUrl,
        },
        linkedAccounts: await fetchLinkedAccounts(user.id),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
};

const Sidebar = () => {
  const { data, isLoading } = useUserData();
  const user = data?.user;
  const linkedAccounts = data?.linkedAccounts || [];

  return (
    <div className="h-full w-[300px] bg-overlay-5 border-r border-overlay-10 flex flex-col">
      {/* Logo */}
      <div className="h-14 px-6 border-b border-overlay-10 flex items-center">
        <Link href="/">
          <Image alt="Linkcal Logo" className="w-14" src={linkcalLogo} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-grow gap-1 p-3">
        <NavLink href="/calendar" icon={CalendarIcon}>
          Calendar
        </NavLink>
        <NavLink href="/accounts" icon={AtSymbolIcon}>
          Accounts
        </NavLink>
        <NavLink href="/automations" icon={ForwardIcon}>
          Automations
        </NavLink>

        {/* Linked Accounts Section */}
        <div className="mt-4">
          <div className="flex items-center gap-2 my-2">
            <span className="text-xs text-white/70 opacity-50 whitespace-nowrap">
              Linked Accounts
            </span>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-overlay-15 to-transparent" />
          </div>

          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  <SkeletonLoader className="w-1 h-1 rounded-full" />
                  <SkeletonLoader className="h-3 w-24 rounded-full" />
                </div>
              ))
            : linkedAccounts?.map((account) => (
                <Link
                  key={account.id}
                  href={`/calendar?id=${account.id}`}
                  className="flex items-center gap-1 p-2 rounded-lg hover:bg-overlay-10 hover:text-white text-[13px] group transition-all duration-300 ease-in-out"
                >
                  <div className="w-4 h-3 flex items-center justify-center transition-all">
                    <div
                      className="w-1 h-1 rounded-full bg-white opacity-20 group-hover:opacity-100 duration-700 ease-in-out"
                      style={{ backgroundColor: account.color }}
                    ></div>
                  </div>
                  {account.email}
                </Link>
              ))}
        </div>
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-overlay-10">
        {user ? (
          <UserMenu user={user} imageUrl={user.imageUrl} />
        ) : (
          <div className="flex items-center gap-3">
            <SkeletonLoader className="h-8 w-8 rounded-full" />
            <div className="flex flex-col gap-1">
              <SkeletonLoader className="h-3 w-20 rounded" />
              <SkeletonLoader className="h-2 w-24 rounded" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
