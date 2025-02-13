"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import AccountsIcon from "@/public/icons/accounts.svg";
import CalendarIcon from "@/public/icons/calendar.svg";
import AutomationsIcon from "@/public/icons/automations.svg";
import MeetingsIcon from "@/public/icons/meetings.svg";
import BookingsIcon from "@/public/icons/bookings.svg";
import cn from "@/utils/cn";
import linkcalLogo from "@/public/logos/linkcalio.svg";
import UserMenu from "../Navbar/UserMenu";
import { createClient } from "@/utils/supabase/client";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";

// Reusable navigation link component
const NavLink = ({
  href,
  icon,
  children,
  disabled,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 p-3 py-2 rounded-lg text-sm transition-all duration-300 ease-in-out group",
        "hover:bg-greybackground_light hover:text-white",
        isActive ? "bg-greybackground_light text-white" : "text-white/70",
        disabled && "opacity-20 cursor-not-allowed pointer-events-none"
      )}
    >
      <Image
        src={icon}
        alt="Navigation Icon"
        className={cn(
          "w-[13px] opacity-30 group-hover:opacity-100 transition-all duration-300 ease-in-out",
          isActive ? "opacity-100" : "opacity-30"
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

export default function Sidebar({
  showSidebar = true,
}: {
  showSidebar?: boolean;
}) {
  if (!showSidebar) {
    return null;
  }

  const { data, isLoading } = useUserData();
  const user = data?.user;
  const linkedAccounts = data?.linkedAccounts || [];
  const pathname = usePathname();
  if (pathname.includes("/login") || pathname.includes("/auth")) return null;

  return (
    <div className="h-full w-[275px] bg-greybackground border-r border-faded20 flex flex-col">
      {/* Logo */}
      <div className="p-6 h-16 border-b border-faded20 flex items-center">
        <Link href="/">
          <Image alt="Linkcal Logo" className="w-20" src={linkcalLogo} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-grow gap-0.5 p-3">
        <NavLink href="/accounts" icon={AccountsIcon}>
          <div className="flex items-center w-full">
            <span>Accounts</span>
            {linkedAccounts.length > 0 && (
              <div className="ml-2 bg-white/10 text-white w-4 h-4 flex items-center justify-center rounded-[6px] text-[10px] font-extralight">
                {linkedAccounts.length}
              </div>
            )}
          </div>
        </NavLink>
        <NavLink href="/calendar" icon={CalendarIcon}>
          Calendar
        </NavLink>
        <NavLink href="/automations" icon={AutomationsIcon} disabled>
          Automations
        </NavLink>
        <NavLink href="/meetings" icon={MeetingsIcon} disabled>
          Meetings
        </NavLink>
        <NavLink href="/bookings" icon={BookingsIcon} disabled>
          Bookings
        </NavLink>

        {/* Linked Accounts Section */}
        {/* <div className="mt-4">
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
        </div> */}
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-faded20">
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
}
