"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowPathIcon,
  LockClosedIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Components & Icons
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import AccountCard from "@/components/Accountcard";
import accountsIcon from "@/public/icons/accounts.svg";
import plusIconLight from "@/public/icons/plusiconlight.svg";
import plusIconWhite from "@/public/icons/plusiconwhite.svg";
import googleIcon from "@/public/logos/googlecalendar_logo.svg";
import microsoftIcon from "@/public/logos/microsoftcalendar_logo.svg";

// API/Util functions
import { createClient } from "@/utils/supabase/client";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import { syncMeetingsToDatabase } from "@/utils/meetings/syncMeetings";
import { linkAccount, AuthData } from "@/utils/linkAccount";

// Types
import { LinkedAccount } from "@/db/schema";

// --- Constants ---
const STALE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes
const COLOR_OPTIONS = [
  "#77BDFF",
  "#77FF82",
  "#7B77FF",
  "#AD77FF",
  "#FF779B",
  "#FF77DF",
  "#FFF177",
];

// --- Framer Motion Variants ---
const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.6, 0.05, 0.01, 0.99] },
  },
};

// --- Skeleton Loader Component ---
const SkeletonAccountCard: React.FC = () => (
  <div className="animate-pulse bg-faded3 border border-white/5 rounded-xl p-6 min-h-[200px]">
    <div className="h-6 bg-faded10 rounded mb-4 w-1/2 opacity-30" />
    <div className="h-4 bg-faded10 rounded mb-2 w-3/4 opacity-30" />
    <div className="h-4 bg-faded10 rounded w-1/2 opacity-30" />
  </div>
);

// --- Add Account Card Component ---
const AddAccountCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <div
    onClick={onClick}
    className="h-full cursor-pointer border-2 border-dotted border-white/10 bg-faded2 hover:border-white/20 hover:bg-greybackground/50 group transition-all duration-300 flex items-center justify-center rounded-xl p-4 min-h-[200px]"
  >
    <Image
      src={plusIconWhite}
      alt="Add Account"
      className="w-3 opacity-30 group-hover:opacity-80 group-hover:rotate-90 transition-all duration-300"
    />
  </div>
);

// --- Main Accounts Component ---
const Accounts: React.FC = () => {
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: linkedAccounts, isLoading } = useQuery<
    Partial<LinkedAccount>[]
  >({
    queryKey: ["linkedAccounts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      return userData?.user ? fetchLinkedAccounts(userData.user.id) : [];
    },
    staleTime: STALE_THRESHOLD_MS,
  });

  // --- Local State ---
  const [showModal, setShowModal] = useState(false);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [accountName, setAccountName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done">(
    "idle"
  );
  const [manualResyncStatus, setManualResyncStatus] = useState<{
    [accountId: string]: "idle" | "syncing" | "done";
  }>({});

  // --- NEW: Step of the linking flow: 1=Pick Provider, 2=Waiting/Spinner, 3=Final Details
  const [flowStep, setFlowStep] = useState<1 | 2 | 3>(1);

  // --- Effects ---
  useEffect(() => {
    localStorage.removeItem("tempLinkedAccount");
  }, []);

  // Listen for localStorage OAuth data updates
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "tempLinkedAccount" && event.newValue) {
        const data = JSON.parse(event.newValue);
        if (Date.now() - data.timestamp < STALE_THRESHOLD_MS) {
          setAuthData({
            refreshToken: data.refreshToken,
            email: data.email,
            provider: data.provider,
          });
          // Move to final step once we have auth data:
          setFlowStep(3);
        } else {
          localStorage.removeItem("tempLinkedAccount");
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // --- Event Handlers ---
  const handleAddAccount = () => {
    setShowModal(true);
    setFlowStep(1); // Reset to first step each time
  };

  const handleStartAuth = (provider: "google" | "microsoft") => {
    // Move to waiting/spinner step
    setFlowStep(2);
    // Then open OAuth window
    window.open(
      `/accounts/link?provider=${provider}`,
      "_blank",
      "width=600,height=600"
    );
  };

  const handleLinkAccount = async () => {
    setSyncStatus("syncing");
    try {
      if (authData) {
        await linkAccount(authData, accountName, selectedColor);
      }
      setSyncStatus("done");
    } catch (error: any) {
      console.error("Error linking account:", error);
      alert(error.message);
      setSyncStatus("idle");
    } finally {
      setAuthData(null);
      setShowModal(false);
      setAccountName("");
      setSelectedColor("#ffffff");
      localStorage.removeItem("tempLinkedAccount");
      queryClient.invalidateQueries({ queryKey: ["linkedAccounts"] });
    }
  };

  const handleUnlinkAccount = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("linked_accounts")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Error unlinking account:", error);
      return;
    }
    console.log("Account unlinked successfully");
    queryClient.invalidateQueries({ queryKey: ["linkedAccounts"] });
  };

  const handleResyncAccount = async (account: LinkedAccount) => {
    const accountId = account.id;
    setManualResyncStatus((prev) => ({ ...prev, [accountId]: "syncing" }));
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("User not authenticated. Please log in.");
      setManualResyncStatus((prev) => ({ ...prev, [accountId]: "idle" }));
      return;
    }
    const validEvents = await fetchMeetings(accountId);
    if (validEvents) {
      await syncMeetingsToDatabase(validEvents, accountId, user.id);
      alert(
        `Resync complete for account ${account.account_name || account.email}`
      );
    } else {
      alert(
        `No meetings fetched to sync for account ${
          account.account_name || account.email
        }`
      );
    }
    queryClient.invalidateQueries({ queryKey: ["linkedAccounts"] });
    setManualResyncStatus((prev) => ({ ...prev, [accountId]: "done" }));
  };

  // --- Multi-Step Modal Content ---
  const renderModalContent = () => {
    // Step 2: Spinner/waiting
    if (flowStep === 2) {
      return (
        <div className="flex flex-col items-center gap-12 bg-greybackground border-[1px] border-white/10 rounded-xl p-6 w-[350px]">
          {/* Modal Header */}
          <div className="flex w-full justify-between">
            <div className="flex flex-col gap-0.5 w-full">
              <h2 className="text-xl font-light">Linking your account</h2>
              <p className="text-xs text-white/40">
                Grant access to sync your calendar
              </p>
            </div>
            <button
              className="opacity-50 bg-greybackground_light border-[1px] border-white/10 rounded-lg w-7 h-7 flex items-center justify-center hover:opacity-100 transition-all duration-300"
              onClick={() => setShowModal(false)}
            >
              <XMarkIcon className="w-4" />
            </button>
          </div>
          {/* Simple spinner or loading indicator */}
          <div className="flex items-center justify-center min-h-[100px]">
            <ArrowPathIcon className="w-4 opacity-40 animate-spin" />
          </div>
          {/* Footer Content of Modal */}
          <p className="text-[10px] text-white/30 flex items-center gap-1">
            <LockClosedIcon className="w-2" />
            Do not close this window or popup during authentication
          </p>
        </div>
      );
    }

    // Step 3: Final details (requires authData)
    if (flowStep === 3 && authData) {
      return (
        <div className="flex flex-col gap-4 bg-greybackground border border-white/10 rounded-xl p-6 w-[350px]">
          {/* Modal Header */}
          <div className="flex w-full justify-between">
            <div className="flex flex-col gap-0.5 w-full">
              <h2 className="text-xl font-light">Linking your account</h2>
              <p className="text-xs text-white/40">
                Grant access to sync your calendar
              </p>
            </div>
            <button
              className="opacity-50 bg-greybackground_light border-[1px] border-white/10 rounded-lg w-7 h-7 flex items-center justify-center hover:opacity-100 transition-all duration-300"
              onClick={() => setShowModal(false)}
            >
              <XMarkIcon className="w-4" />
            </button>
          </div>

          {/* Gradient Divider */}
          <div className="h-px w-full bg-gradient-to-r from-white/0 via-white/20 to-white/0" />

          {/* Account Details & Inputs */}
          <div className="flex flex-col gap-5 my-4">
            {/* Account Details & Name Input */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <Image
                  src={
                    authData.provider === "google" ? googleIcon : microsoftIcon
                  }
                  alt={authData.provider}
                  width={14}
                  height={14}
                />
                <p className="text-xs font-medium opacity-30">
                  {authData.email}
                </p>
              </div>
              <input
                type="text"
                value={accountName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setAccountName(e.target.value)
                }
                placeholder="Linked Account Name"
                className="p-2.5 rounded-lg bg-faded8 border-[1px] border-white/5 placeholder:text-white/30 text-sm font-light text-white outline-0 focus:border-white/30 focus:bg-faded10 transition-all duration-300"
              />
            </div>
            {/* Linked Account Color */}
            <div className="flex flex-col gap-1">
              <p className="text-xs text-white/30 mb-2">Linked Account Color</p>
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`size-5 origin-center rounded-full transition-all duration-500 hover:opacity-100 ${
                      selectedColor === color ? "opacity-100" : "opacity-20"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* TRANSPARENT Divider */}
          <div className="h-px w-full bg-transparent" />

          {/* Cancel and Link Account Button */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowModal(false)}
              size="base"
              variant="outline"
            >
              Cancel
            </Button>
            {syncStatus === "syncing" ? (
              <Button disabled>Syncing Meetings...</Button>
            ) : (
              <Button onClick={handleLinkAccount}>Link Account</Button>
            )}
          </div>
        </div>
      );
    }

    // Default Step 1: Pick provider (shown if no authData yet)
    return (
      <div className="flex flex-col items-center gap-12 bg-greybackground border-[1px] border-white/10 rounded-xl p-6 w-[350px]">
        <div className="flex w-full justify-between">
          <div className="flex flex-col gap-0.5 w-full">
            <h2 className="text-xl font-light">Link a New Account</h2>
            <p className="text-xs text-white/40">
              Grant access to sync your calendar
            </p>
          </div>
          <button
            className="opacity-50 bg-greybackground_light border-[1px] border-white/10 rounded-lg w-7 h-7 flex items-center justify-center hover:opacity-100 transition-all duration-300"
            onClick={() => setShowModal(false)}
          >
            <XMarkIcon className="w-4" />
          </button>
        </div>

        <div className="flex flex-col w-full gap-2">
          <Button
            onClick={() => handleStartAuth("google")}
            size="base"
            variant="solid"
            className="flex gap-2 items-center w-full"
          >
            <Image src={googleIcon} alt="Google" width={16} height={16} />
            Link Google Account
          </Button>
          <Button
            onClick={() => handleStartAuth("microsoft")}
            size="base"
            variant="solid"
            className="flex gap-2 items-center w-full"
          >
            <Image src={microsoftIcon} alt="Microsoft" width={16} height={16} />
            Link Microsoft Account
          </Button>
          <Button
            onClick={() => setShowModal(false)}
            size="base"
            variant="outline"
            className="flex gap-2 items-center w-full"
          >
            Cancel
          </Button>
        </div>

        <p className="text-[10px] text-white/30 flex items-center gap-1">
          <LockClosedIcon className="w-2" />
          Permissions are for calendar management only
        </p>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen space-y-9">
      {/* Header */}
      <header>
        <div className="flex items-center gap-1 text-xs opacity-50 mb-4">
          <Image
            src={accountsIcon}
            alt="Accounts Icon"
            className="w-3 opacity-50"
          />
          <span>Accounts</span>
        </div>
        <div className="flex items-end justify-between w-full">
          <div className="space-y-1">
            <h1 className="text-2xl font-light">Linked Accounts</h1>
            <p className="text-sm text-white/80">
              Connect, view, and manage all your calendar accounts in one place.
            </p>
          </div>
          {!isLoading && (
            <Button
              size="sm"
              variant="solid"
              className="group"
              onClick={handleAddAccount}
            >
              <Image
                src={plusIconLight}
                alt="Add Account"
                className="w-2.5 mr-0.5 opacity-50 group-hover:opacity-70 group-hover:rotate-90 transition-all duration-300"
              />
              Add New Account
            </Button>
          )}
        </div>
      </header>

      {/* Divider */}
      <div className="h-px w-full bg-white/5"></div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonAccountCard key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {(linkedAccounts || [])
            .filter((account): account is LinkedAccount => Boolean(account.id))
            .map((account) => (
              <motion.div key={account.id} variants={itemVariants}>
                <AccountCard
                  account={account}
                  manualResyncStatus={manualResyncStatus}
                  handleUnlinkAccount={handleUnlinkAccount}
                  handleResyncAccount={handleResyncAccount}
                />
              </motion.div>
            ))}
          {!isLoading && (
            <motion.div variants={itemVariants} className="h-full">
              <AddAccountCard onClick={handleAddAccount} />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Modal for Account Linking */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default Accounts;
