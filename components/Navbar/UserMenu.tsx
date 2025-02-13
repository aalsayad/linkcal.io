"use client";

import { createClient } from "@/utils/supabase/client";
import React, { useState, useRef } from "react";
import {
  Cog6ToothIcon,
  ArrowLeftEndOnRectangleIcon,
  LockClosedIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import useClickOutside from "@/hooks/useClickOutside";
import cn from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface User {
  name: string;
  email: string;
}

interface UserMenuProps {
  user: User;
  imageUrl: string;
}

const UserMenu = ({ user, imageUrl }: UserMenuProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if a click occurs outside the container (which includes both the toggle and the dropdown)
  useClickOutside<HTMLDivElement>(dropdownRef, () => setIsOpen(false));

  const handleLogout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Toggle button */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center justify-between gap-1.5 p-1 px-2 cursor-pointer transition-all border-[1px] border-white/0 hover:bg-greybackground_light group select-none w-full relative z-[999]",
          isOpen
            ? "rounded-bl-lg rounded-br-lg border-[1px] border-white/10 bg-greybackground_light"
            : "rounded-lg"
        )}
      >
        {/* User Avatar and Name */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full overflow-hidden bg-white/10 border-[1px] border-overlay-20">
            <Image
              alt="user avatar"
              className="h-full object-cover"
              width={300}
              height={300}
              src={imageUrl}
            />
          </div>
          <span className="text-xs md:text-sm">{user.name}</span>
        </div>

        <EllipsisVerticalIcon
          className={cn(
            "h-4 text-white/40 group-hover:text-white/70 transition-colors duration-300 ease-in-out",
            { "text-white/70": isOpen }
          )}
        />
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{
              opacity: { duration: 0.1 },
              y: { duration: 0.25, ease: [0.6, 0.05, 0.01, 0.99] },
            }}
            className={cn(
              "absolute bg-greybackground_light right-0 bottom-full w-full min-w-48 origin-bottom-right border border-b-white/0 border-white/10 shadow-lg select-none z-[1]",
              "rounded-t-lg rounded-b-none"
            )}
          >
            <div className="p-1.5">
              <div className="px-2.5 py-1.5 select-none font-thin">
                <span className="mb-1 flex items-center text-white p-0.5 bg-[#ffffff10] px-2 pr-3 rounded-full text-[10px] w-fit text-nowrap">
                  <LockClosedIcon className="h-2.5 w-2.5 mr-0.5 opacity-50" />
                  Verified
                </span>
                <span
                  className="w-full block text-[10px] md:text-xs"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(255, 255, 255, 0.3) 95%, rgba(255, 255, 255, 0) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {user.email}
                </span>
              </div>
              <div className="border-t border-white/10 my-1" />
              <button className="w-full flex items-center gap-2 p-2 text-xs md:text-sm rounded-md hover:bg-white/5 transition-colors select-none">
                <Cog6ToothIcon className="h-4 w-4 text-white/60" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 p-2 text-xs md:text-sm rounded-md hover:bg-white/5 transition-colors text-red-400 hover:text-red-300 select-none"
              >
                <ArrowLeftEndOnRectangleIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
