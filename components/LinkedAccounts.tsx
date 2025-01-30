"use client";

import React, { useEffect, useState } from "react";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";
import { createClient } from "@/utils/supabase/client";
import {
  FaGoogle,
  FaMicrosoft,
  FaUnlink,
  FaForward,
  FaTrash,
} from "react-icons/fa";
import Button from "./Button";
import { motion, AnimatePresence } from "framer-motion";
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import SkeletonCard from "./SkeletonCard";
import { forwardMeetings } from "@/utils/meetings/forwardMeetings";
import { deleteLinkCalEvents } from "@/utils/meetings/deleteLinkCalEvents";
import { syncMeetingsToDatabase } from "@/utils/meetings/syncMeetings";
import {
  ArrowPathIcon,
  TrashIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface LinkedAccount {
  id: string;
  email: string;
  provider: string;
  color?: string;
}

const CALENDAR_COLORS = [
  "#FF6B6B", // bright red
  "#4ECDC4", // bright teal
  "#45B7D1", // bright blue
  "#96CEB4", // sage green
  "#FFD93D", // bright yellow
  "#FF8CC8", // bright pink
  "#A06CD5", // bright purple
  "#4CAF50", // bright green
];

const LinkedAccountsGrid = () => {
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingStates, setLoadingStates] = useState<{
    [linkedAccountId: string]: boolean;
  }>({});
  const [forwardingStates, setForwardingStates] = useState<{
    [linkedAccountId: string]: boolean;
  }>({});
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [deletingStates, setDeletingStates] = useState<{
    [linkedAccountId: string]: boolean;
  }>({});
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  useEffect(() => {
    const loadLinkedAccounts = async () => {
      setLoadingAccounts(true);
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("Error fetching user:", error);
        setLoadingAccounts(false);
        return;
      }

      const accounts = await fetchLinkedAccounts(user.id);
      setLinkedAccounts(accounts);
      setLoadingAccounts(false);
    };

    loadLinkedAccounts();
  }, []);

  const handleUnlinkAccount = async (linkedAccountId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("linked_accounts")
      .delete()
      .eq("id", linkedAccountId);

    if (error) {
      console.error("Error unlinking account:", error);
    } else {
      setLinkedAccounts((prev) =>
        prev.filter((account) => account.id !== linkedAccountId)
      );
    }
  };

  const handleSyncCalendar = async (linkedAccountId: string, email: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, [linkedAccountId]: true }));
      console.log("🔄 Starting calendar sync for:", email);

      const meetings = await fetchMeetings(linkedAccountId);
      if (meetings) {
        console.log(meetings);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id) throw new Error("No user found");

        await syncMeetingsToDatabase(meetings, linkedAccountId, user.id);
        console.log("✅ Calendar sync completed successfully");
      }
    } catch (error) {
      console.error("❌ Calendar sync failed:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [linkedAccountId]: false }));
    }
  };

  const handleForwardMeetings = async (
    sourceLinkedAccountId: string,
    targetLinkedAccountId: string
  ) => {
    try {
      setForwardingStates((prev) => ({
        ...prev,
        [sourceLinkedAccountId]: true,
      }));
      await forwardMeetings(sourceLinkedAccountId, targetLinkedAccountId);
      setSelectedTarget("");
    } catch (error) {
      console.error("Forward failed:", error);
    } finally {
      setForwardingStates((prev) => ({
        ...prev,
        [sourceLinkedAccountId]: false,
      }));
    }
  };

  const handleDeleteLinkCalEvents = async (linkedAccountId: string) => {
    try {
      setDeletingStates((prev) => ({ ...prev, [linkedAccountId]: true }));
      if (
        !window.confirm(
          "Are you sure you want to delete all LinkCal events from your calendar?"
        )
      )
        return;

      await deleteLinkCalEvents(linkedAccountId);
      alert("All LinkCal events have been deleted from your calendar.");
    } catch (error) {
      console.error("Error deleting LinkCal events:", error);
      alert("Failed to delete LinkCal events.");
    } finally {
      setDeletingStates((prev) => ({ ...prev, [linkedAccountId]: false }));
    }
  };

  const handleColorSelect = async (accountId: string, color: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("linked_accounts")
      .update({ color })
      .eq("id", accountId);

    if (error) {
      console.error("Error updating color:", error);
    } else {
      setLinkedAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? { ...acc, color } : acc))
      );
    }
    setColorPickerOpen(null);
  };

  if (loadingAccounts) {
    return (
      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 mt-8 md:mt-12">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (linkedAccounts.length === 0) {
    return (
      <div className="text-white/60 p-4">
        <p>No linked accounts found.</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 mt-8 md:mt-12">
      <AnimatePresence>
        {linkedAccounts.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
              delay: index * 0.1,
            }}
            className="relative rounded-lg shadow-lg p-3 md:p-4 bg-overlay-5 border border-overlay-10 flex flex-col justify-between"
          >
            <button
              onClick={() => handleUnlinkAccount(account.id)}
              className="group absolute top-2 right-2 flex items-center justify-center h-8 w-8 rounded-full bg-transparent hover:bg-red-500/10 transition-colors duration-300"
            >
              <FaUnlink className="font-light w-3 text-white/60 group-hover:text-red-500 transition-colors duration-300" />
            </button>

            <div>
              <div className="flex items-center mt-2 text-white/40 mb-3">
                {account.provider === "google" ? (
                  <FaGoogle className="w-3 mr-2" />
                ) : (
                  <FaMicrosoft className="w-3 mr-2" />
                )}
                <span className="text-xs md:text-sm font-[200] capitalize">
                  {account.provider}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="relative">
                  <button
                    onClick={() =>
                      setColorPickerOpen((prev) =>
                        prev === account.id ? null : account.id
                      )
                    }
                    className="w-4 h-4 rounded-full hover:scale-110 transition-transform"
                    style={{ backgroundColor: account.color || "#ffffff" }}
                  />

                  {colorPickerOpen === account.id && (
                    <div className="absolute top-full left-0 mt-2 p-2 bg-overlay-5 border border-overlay-10 rounded-lg shadow-lg z-10">
                      <div className="grid grid-cols-4 gap-2">
                        {CALENDAR_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(account.id, color)}
                            className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-base md:text-lg font-medium text-white/90">
                  {account.email}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full whitespace-nowrap text-xs"
                  onClick={() => handleSyncCalendar(account.id, account.email)}
                  disabled={
                    loadingStates[account.id] ||
                    forwardingStates[account.id] ||
                    deletingStates[account.id]
                  }
                >
                  {loadingStates[account.id] ? (
                    <>
                      <ArrowPathIcon className="w-3 h-3 mr-1.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-3 h-3 mr-1.5" />
                      Sync Calendar
                    </>
                  )}
                </Button>
              </div>
              <div className="h-[1px] bg-overlay-10 w-full my-4"></div>
              <div className="flex gap-2 opacity-70">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 whitespace-nowrap text-xs py-1"
                  onClick={() => handleDeleteLinkCalEvents(account.id)}
                  disabled={
                    loadingStates[account.id] ||
                    forwardingStates[account.id] ||
                    deletingStates[account.id]
                  }
                >
                  {deletingStates[account.id] ? (
                    <>
                      <ArrowPathIcon className="w-3 h-3 mr-1.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-3 h-3 mr-1.5" />
                      Delete Events
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 whitespace-nowrap text-xs py-1"
                  onClick={() => setSelectedTarget(account.id)}
                  disabled={
                    loadingStates[account.id] ||
                    forwardingStates[account.id] ||
                    deletingStates[account.id]
                  }
                >
                  <ArrowRightIcon className="w-3 h-3 mr-1.5" />
                  Forward
                </Button>
              </div>
            </div>

            {selectedTarget === account.id && (
              <div className="mt-4">
                <p className="text-xs text-white/60 mb-2">Forward to:</p>
                <div className="space-y-1">
                  {linkedAccounts
                    .filter((a) => a.id !== account.id)
                    .map((target) => (
                      <button
                        key={target.id}
                        onClick={() =>
                          handleForwardMeetings(account.id, target.id)
                        }
                        className="flex items-center w-full p-2 text-sm hover:bg-overlay-10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={Object.values(forwardingStates).some(Boolean)}
                      >
                        {forwardingStates[account.id] ? (
                          <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                        ) : target.provider === "google" ? (
                          <FaGoogle className="w-4 h-4 mr-2" />
                        ) : (
                          <FaMicrosoft className="w-4 h-4 mr-2" />
                        )}
                        {target.email}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LinkedAccountsGrid;
