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
import { fetchMeetings } from "@/utils/fetchLinkedAccountInfo";
import SkeletonCard from "./SkeletonCard";
import { forwardMeetings } from "@/utils/forwardMeetings";
import { deleteLinkCalEvents } from "@/utils/deleteLinkCalEvents";

interface LinkedAccount {
  id: string;
  email: string;
  provider: string;
}

const LinkedAccountsGrid = () => {
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [forwardingStates, setForwardingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedTarget, setSelectedTarget] = useState<string>("");
  const [deletingStates, setDeletingStates] = useState<{
    [key: string]: boolean;
  }>({});

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

  const handleUnlinkAccount = async (accountId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("linked_accounts")
      .delete()
      .eq("id", accountId);

    if (error) {
      console.error("Error unlinking account:", error);
    } else {
      setLinkedAccounts((prev) =>
        prev.filter((account) => account.id !== accountId)
      );
    }
  };

  const handleFetchMeetings = async (id: string, email: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, [id]: true }));
      const meetings = await fetchMeetings(id, email);
      console.log("Meetings fetched:", meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleForwardMeetings = async (
    sourceAccountId: string,
    targetAccountId: string
  ) => {
    try {
      setForwardingStates((prev) => ({ ...prev, [sourceAccountId]: true }));
      const result = await forwardMeetings(sourceAccountId, targetAccountId);
      if (result.success) {
        console.log(`Successfully forwarded ${result.count} meetings`);
      }
    } catch (error) {
      console.error("Forwarding failed:", error);
    } finally {
      setForwardingStates((prev) => ({ ...prev, [sourceAccountId]: false }));
      setSelectedTarget("");
    }
  };

  const handleDeleteLinkCalEvents = async (accountId: string) => {
    try {
      setDeletingStates((prev) => ({ ...prev, [accountId]: true }));
      if (
        !window.confirm(
          "Are you sure you want to delete all LinkCal events from your calendar?"
        )
      )
        return;

      await deleteLinkCalEvents(accountId);
      alert("All LinkCal events have been deleted from your calendar.");
    } catch (error) {
      console.error("Error deleting LinkCal events:", error);
      alert("Failed to delete LinkCal events.");
    } finally {
      setDeletingStates((prev) => ({ ...prev, [accountId]: false }));
    }
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
              <p className="text-base md:text-lg font-medium text-white/90 mb-6 md:mb-8">
                {account.email}
              </p>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => handleFetchMeetings(account.id, account.email)}
                disabled={
                  loadingStates[account.id] ||
                  forwardingStates[account.id] ||
                  deletingStates[account.id]
                }
              >
                {loadingStates[account.id] ? "Fetching..." : "Fetch Events"}
              </Button>

              {linkedAccounts.length > 1 && (
                <div className="relative group">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-fit"
                    onClick={() =>
                      setSelectedTarget(
                        selectedTarget === account.id ? "" : account.id
                      )
                    }
                    disabled={
                      forwardingStates[account.id] || deletingStates[account.id]
                    }
                  >
                    <FaForward className="mr-2" />
                    {forwardingStates[account.id] ? "Forwarding..." : "Forward"}
                  </Button>

                  <AnimatePresence>
                    {selectedTarget === account.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full mb-2 right-0 bg-overlay-5 p-2 rounded-lg shadow-lg min-w-[200px] z-10"
                      >
                        <p className="text-xs text-white/60 mb-2">
                          Forward to:
                        </p>
                        {linkedAccounts
                          .filter((a) => a.id !== account.id)
                          .map((target) => (
                            <button
                              key={target.id}
                              onClick={() =>
                                handleForwardMeetings(account.id, target.id)
                              }
                              className="flex items-center w-full p-2 text-sm hover:bg-overlay-10 rounded transition-colors"
                              disabled={
                                forwardingStates[account.id] ||
                                deletingStates[account.id]
                              }
                            >
                              {target.provider === "google" ? (
                                <FaGoogle className="mr-2" />
                              ) : (
                                <FaMicrosoft className="mr-2" />
                              )}
                              {target.email}
                            </button>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => handleDeleteLinkCalEvents(account.id)}
                disabled={deletingStates[account.id]}
              >
                {deletingStates[account.id] ? (
                  "Deleting..."
                ) : (
                  <>
                    <FaTrash className="mr-2" />
                    Delete LinkCal Events
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LinkedAccountsGrid;
