"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import linkcalLogo from "@/public/linkcal.svg";
import UserMenu from "../Navbar/UserMenu";
import {
  CalendarIcon,
  HomeIcon,
  ForwardIcon,
  AtSymbolIcon,
  ArrowTurnDownRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";
import ArrowDownRightIcon from "@/public/icons/arrow-down-right.svg";

const Sidebar = () => {
  const [user, setUser] = useState<{
    name: string;
    email: string;
    imageUrl: string;
  } | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<
    Array<{ id: string; email: string; color: string }>
  >([]);
  const [isLoadingLinkedAccounts, setIsLoadingLinkedAccounts] = useState(false);

  useEffect(() => {
    async function loadUserAndAccounts() {
      const supabase = createClient();
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      if (supabaseUser) {
        const avatarUrl =
          supabaseUser.user_metadata?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            supabaseUser.user_metadata?.full_name || supabaseUser.email || ""
          )}&size=128&background=random&rounded=true`;

        setUser({
          name:
            supabaseUser.user_metadata?.full_name || supabaseUser.email || "",
          email: supabaseUser.email || "",
          imageUrl: avatarUrl,
        });

        setIsLoadingLinkedAccounts(true);
        try {
          const accounts = await fetchLinkedAccounts(supabaseUser.id);
          setLinkedAccounts(accounts);
        } finally {
          setIsLoadingLinkedAccounts(false);
        }
      }
    }

    loadUserAndAccounts();
  }, []);

  return (
    <div className="h-full w-[300px] bg-overlay-5 border-r-[1px] border-overlay-10 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b-[1px] border-overlay-10">
        <Link href="/">
          <Image alt="Linkcal Logo" className="w-14" src={linkcalLogo} />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-grow gap-1 p-3 text-sm text-white/70">
        {/* Static Links */}
        <Link
          href={`/calendar`}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-overlay-10 text-white/70 hover:text-white text-sm group transition-all duration-300 ease-in-out"
        >
          <div className="w-4 h-3 flex items-center justify-center">
            <CalendarIcon className="w-4 opacity-60 group-hover:opacity-100 transition-all duration-300 ease-in-out" />
          </div>
          Calendar
        </Link>
        <Link
          href="/accounts"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-overlay-10 hover:text-white group transition-all duration-300 ease-in-out"
        >
          <AtSymbolIcon className="w-4 opacity-60 group-hover:opacity-100 transition-all duration-300 ease-in-out" />
          Accounts
        </Link>
        <Link
          href="/automations"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-overlay-10 hover:text-white group transition-all duration-300 ease-in-out"
        >
          <ForwardIcon className="w-4 opacity-60 group-hover:opacity-100 transition-all duration-300 ease-in-out" />
          Automations
        </Link>

        {/* Linked Accounts Section */}
        <div className="mt-4">
          <div className="w-full flex items-center">
            <p className="flex items-center gap-2 p-2 rounded-lg text-xs text-white/70 opacity-50 text-nowrap">
              Linked Accounts
            </p>
            <span className="w-full h-[1px] bg-gradient-to-r from-transparent via-overlay-15 to-transparent"></span>
          </div>

          {/* Loading State */}
          {!user || isLoadingLinkedAccounts ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg animate-pulse"
              >
                <div className="w-4 h-3 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-overlay-10" />
                </div>
                <div className="h-3 w-24 bg-overlay-10 rounded-full" />
              </div>
            ))
          ) : (
            <>
              {linkedAccounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/calendar/${account.id}`}
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
            </>
          )}
        </div>
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-overlay-10">
        {user ? (
          <UserMenu
            user={{ name: user.name, email: user.email }}
            imageUrl={user.imageUrl}
          />
        ) : (
          <div className="flex items-center gap-3">
            <motion.div
              className="h-8 w-8 rounded-full bg-overlay-10"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="flex flex-col gap-1">
              <motion.div
                className="h-3 w-20 rounded bg-overlay-10"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="h-2 w-24 rounded bg-overlay-10"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
