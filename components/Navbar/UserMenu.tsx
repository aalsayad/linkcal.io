"use client";

import { createClient } from "@/utils/supabase/client";
import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowLeftEndOnRectangleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import useClickOutside from "@/hooks/useClickOutside";
import cn from "@/utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

const UserMenu = ({
  user,
  imageUrl,
}: {
  user: { name: string; email: string };
  imageUrl: string;
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside<HTMLDivElement>(dropdownRef, () => setIsOpen(false));

  const handleLogout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log(error);
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 p-1.5 pr-3 rounded-full cursor-pointer transition-all hover:bg-white/5 group select-none",
          { "bg-white/5": isOpen }
        )}
      >
        <div className="h-7 w-7 rounded-full overflow-hidden bg-white/10">
          <Image
            alt="user avatar"
            className="h-full object-cover"
            width={300}
            height={300}
            src={imageUrl}
          />
        </div>
        <span className="text-sm font-medium">{user.name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <ChevronDownIcon className="h-2 w-2 text-white/60 group-hover:text-white/80 transition-colors" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="absolute right-0 mt-3 w-fit min-w-48 max-w-60 origin-top-right rounded-lg bg-overlay-5 border border-overlay-10 shadow-lg select-none"
          >
            <div className="p-1.5">
              <div className="px-2.5 py-1.5 select-none font-thin">
                <span className="mb-1 flex items-center text-white p-0.5 bg-[#ffffff10] px-2 pr-3 rounded-full text-[10px] w-fit text-nowrap">
                  <LockClosedIcon className="h-2.5 w-2.5 mr-0.5 opacity-50" />
                  Verified
                </span>
                <span
                  className="w-full block text-xs"
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
              <div className="border-t border-overlay-10 my-1" />
              <button className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-white/5 transition-colors select-none">
                <Cog6ToothIcon className="h-4 w-4 text-white/60" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-white/5 transition-colors text-red-400 hover:text-red-300 select-none"
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
