"use client";

import React, { useEffect, useState } from "react";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";
import { createClient } from "@/utils/supabase/client";
import { FaGoogle, FaMicrosoft, FaUnlink } from "react-icons/fa";
import Button from "./Button";
import { motion, AnimatePresence } from "motion/react";
import { fetchMeetings } from "@/utils/fetchLinkedAccountInfo";

interface LinkedAccount {
  id: string;
  email: string;
  provider: string;
}

const LinkedAccountsGrid = () => {
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);

  useEffect(() => {
    const loadLinkedAccounts = async () => {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error("Error fetching user:", error);
        return;
      }

      const accounts = await fetchLinkedAccounts(user.id);
      setLinkedAccounts(accounts);
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
      setLinkedAccounts((prevAccounts) =>
        prevAccounts.filter((account) => account.id !== accountId)
      );
      console.log("Account unlinked successfully.");
    }
  };

  const [loading, setLoading] = useState(false);

  const handleFetchMeetings = async (id: string, email: string) => {
    try {
      setLoading(true);
      const meetings = await fetchMeetings(id, email);
      console.log("Meetings fetched:", meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

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
              delay: index * 0.1, // Stagger effect
            }}
            className="relative rounded-lg shadow-lg p-3 md:p-4 bg-overlay-5 border border-overlay-10 flex flex-col justify-between"
          >
            <button
              onClick={() => handleUnlinkAccount(account.id)}
              className="group absolute top-2 right-2 flex items-center justify-center h-8 w-8 rounded-full bg-transparent hover:bg-red-500/10 transition-colors duration-300"
            >
              <FaUnlink className=" font-light w-3 text-white/60 group-hover:text-red-500 transition-colors duration-300" />
            </button>
            <div>
              <div className="flex items-center mt-2 text-white/40 mb-3">
                {account.provider === "google" ? (
                  <FaGoogle className="w-3 mr-2" />
                ) : (
                  <FaMicrosoft className="w-3 mr-2" />
                )}
                <span className="text-xs md:text-sm font-[200] capitalize">
                  {account.provider === "google" ? "Google" : "Microsoft"}
                </span>
              </div>
              <p className="text-base md:text-lg font-medium text-white/90 mb-6 md:mb-8">
                {account.email}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-4 w-fit"
              onClick={() => handleFetchMeetings(account.id, account.email)}
              disabled={loading}
            >
              {loading ? "Fetching..." : "Fetch Calendar Events"}
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LinkedAccountsGrid;
