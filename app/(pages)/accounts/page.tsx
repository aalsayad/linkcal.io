"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/Button";
import { PlusIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/Modal";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { fetchLinkedAccounts } from "@/utils/fetchLinkedAccounts";
import { parseUtcTimestamp } from "@/utils/formatDate";

// Import your logos from the public folder
import googleIcon from "@/public/logos/google-logo.svg";
import microsoftIcon from "@/public/logos/microsoft-logo.svg";

// Import meetings utilities
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import { syncMeetingsToDatabase } from "@/utils/meetings/syncMeetings";

type LinkedAccount = {
  id: string;
  email: string;
  provider: string;
  color?: string;
  account_name?: string;
  last_synced?: string;
};

const colorOptions = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFD93D",
  "#A06CD5",
];

const STALE_THRESHOLD_MS = 1000 * 60 * 5; // example 5 minutes

const Accounts = () => {
  const queryClient = useQueryClient();
  const { data: linkedAccounts, isLoading } = useQuery({
    queryKey: ["linkedAccounts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      return userData?.user ? fetchLinkedAccounts(userData.user.id) : [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Local state for modal control and extra account info
  const [showModal, setShowModal] = useState(false);
  const [authData, setAuthData] = useState<{
    provider: string;
    email: string;
    refreshToken: string;
  } | null>(null);
  const [accountName, setAccountName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  // Control polling if you decide to use it elsewhere
  const [pollingEnabled, setPollingEnabled] = useState(false);
  // State to manage syncing status feedback for linking a new account ("idle" | "syncing" | "done")
  const [syncStatus, setSyncStatus] = useState("idle");
  // State to manage manual resync status per account ("idle" | "syncing" | "done")
  const [manualResyncStatus, setManualResyncStatus] = useState<{
    [key: string]: "idle" | "syncing" | "done";
  }>({});

  // Clear the tempLinkedAccount from localStorage when the page loads
  useEffect(() => {
    localStorage.removeItem("tempLinkedAccount");
  }, []);

  // Opens the modal to start account linking
  const handleAddAccount = () => {
    setShowModal(true);
  };

  // Opens the auth pop-up window to start the linking process and enable polling
  const handleStartAuth = async (provider: "google" | "azure-ad") => {
    // Enable polling only when a provider is clicked.
    setPollingEnabled(true);
    window.open(
      `/accounts/link?provider=${provider}`,
      "_blank",
      "width=600,height=600"
    );
  };

  // Listen for changes on localStorage key "tempLinkedAccount"
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "tempLinkedAccount" && event.newValue) {
        const data = JSON.parse(event.newValue);
        // Check if the stored data is fresh
        if (Date.now() - data.timestamp < STALE_THRESHOLD_MS) {
          setAuthData({
            refreshToken: data.refreshToken,
            email: data.email,
            provider: data.provider,
          });
        } else {
          // Clear stale data
          localStorage.removeItem("tempLinkedAccount");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [authData]);

  // (Optional) Poll localStorage periodically if needed
  useEffect(() => {
    if (showModal && pollingEnabled) {
      const interval = setInterval(() => {
        const storedData = localStorage.getItem("tempLinkedAccount");
        if (storedData) {
          const data = JSON.parse(storedData);
          if (Date.now() - data.timestamp < STALE_THRESHOLD_MS && !authData) {
            setAuthData({
              refreshToken: data.refreshToken,
              email: data.email,
              provider: data.provider,
            });
          } else {
            localStorage.removeItem("tempLinkedAccount");
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [showModal, pollingEnabled, authData]);

  // Handle linking account to Supabase (using Supabase auth for user id)
  const handleLinkAccount = async () => {
    // Reset syncing status to idle
    setSyncStatus("idle");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("User not authenticated. Please log in.");
      return;
    }

    const newLink = {
      user_id: user.id,
      provider: authData?.provider,
      email: authData?.email,
      refresh_token: authData?.refreshToken,
      color: selectedColor,
      account_name: accountName,
    };

    // Insert the new linked account and return the inserted row
    const { data, error } = await supabase
      .from("linked_accounts")
      .insert([newLink])
      .select();
    if (error || !data?.length) {
      console.error("Error linking account:", error);
      return;
    }

    const insertedAccount = data[0];
    console.log("Account linked successfully");

    // Set syncing status to true and update button text feedback
    setSyncStatus("syncing");

    // Fetch meetings using the newly linked account id and sync them to the database
    const validEvents = await fetchMeetings(insertedAccount.id);
    if (validEvents) {
      await syncMeetingsToDatabase(validEvents, insertedAccount.id, user.id);
      console.log("Initial meeting sync completed successfully");
      setSyncStatus("done");
    } else {
      console.log("No meetings fetched to sync.");
      setSyncStatus("done");
    }

    // Reset auth state, disable polling, and clear localStorage
    setAuthData(null);
    setShowModal(false);
    setAccountName("");
    setSelectedColor("#ffffff");
    setPollingEnabled(false);
    localStorage.removeItem("tempLinkedAccount");
    queryClient.invalidateQueries({ queryKey: ["linkedAccounts"] });
  };

  // Handle unlinking a linked account
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

  // Handle manual resync of meetings for a given account
  const handleResyncAccount = async (account: LinkedAccount) => {
    const accountId = account.id;
    // Set status to syncing for this account
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
        "Resync complete for account " + (account.account_name || account.email)
      );
    } else {
      alert(
        "No meetings fetched to sync for account " +
          (account.account_name || account.email)
      );
    }

    queryClient.invalidateQueries({ queryKey: ["linkedAccounts"] });
    setManualResyncStatus((prev) => ({ ...prev, [accountId]: "done" }));
  };

  return (
    <div className="min-h-screen bg-overlay-5 flex flex-col p-4">
      {isLoading ? (
        <p className="text-white/40">Loading accounts...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(linkedAccounts || []).map((account: LinkedAccount) => (
            <div
              key={account.id}
              className="p-4 bg-overlay-10 rounded-xl flex flex-col items-center gap-2 relative"
            >
              <div className="flex items-center gap-2">
                {/* Color circle */}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: account.color || "#ffffff" }}
                />
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-overlay-15">
                  <Image
                    src={
                      account.provider === "google" ? googleIcon : microsoftIcon
                    }
                    alt={account.provider}
                    width={24}
                    height={24}
                  />
                </div>
              </div>
              <p className="text-sm font-medium">
                {account.account_name ? account.account_name : account.email}
              </p>
              {account.last_synced && (
                <p className="text-xs text-white/40">
                  Last synced:{" "}
                  {parseUtcTimestamp(account.last_synced).toLocaleString()}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => handleUnlinkAccount(account.id)}
                  size="sm"
                  variant="outline"
                >
                  Unlink
                </Button>
                <Button
                  onClick={() => handleResyncAccount(account)}
                  size="sm"
                  variant="outline"
                >
                  {manualResyncStatus[account.id] === "syncing"
                    ? "Resyncing..."
                    : "Resync"}
                </Button>
              </div>
            </div>
          ))}
          <div
            onClick={handleAddAccount}
            className="cursor-pointer border-2 border-dotted border-white/40 flex items-center justify-center rounded-xl p-4"
          >
            <PlusIcon className="w-6 h-6" />
          </div>
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        {!authData ? (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold">Link a New Account</h2>
            <p className="text-sm text-white/40">Choose a provider</p>
            <div className="flex gap-4">
              <Button
                onClick={() => handleStartAuth("google")}
                size="base"
                variant="outline"
                className="flex gap-2 items-center"
              >
                <Image src={googleIcon} alt="Google" width={20} height={20} />
                Google
              </Button>
              <Button
                onClick={() => handleStartAuth("azure-ad")}
                size="base"
                variant="outline"
                className="flex gap-2 items-center"
              >
                <Image
                  src={microsoftIcon}
                  alt="Microsoft"
                  width={20}
                  height={20}
                />
                Microsoft
              </Button>
            </div>
            <p className="text-xs text-white/40">
              Auth opens in a new window. Complete it and come back here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">Complete Linking</h2>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedColor }}
              >
                <Image
                  src={
                    authData.provider === "google" ? googleIcon : microsoftIcon
                  }
                  alt={authData.provider}
                  width={24}
                  height={24}
                />
              </div>
              <p className="text-sm font-medium">{authData.email}</p>
            </div>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Account Name"
              className="p-2 rounded bg-overlay-10 text-white"
            />
            <div>
              <p className="text-sm text-white/40 mb-2">Choose a color:</p>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full ${
                      selectedColor === color ? "border-2 border-white" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            {syncStatus === "syncing" ? (
              <Button disabled>Syncing Meetings...</Button>
            ) : (
              <Button onClick={handleLinkAccount}>Link Account</Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Accounts;
