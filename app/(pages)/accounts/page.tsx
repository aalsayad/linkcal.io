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
import googleIcon from "@/public/logos/google-logo.svg";
import microsoftIcon from "@/public/logos/microsoft-logo.svg";
import { fetchMeetings } from "@/utils/meetings/fetchMeetings";
import { syncMeetingsToDatabase } from "@/utils/meetings/syncMeetings";
import { linkAccount, AuthData } from "@/utils/linkAccount";

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

const STALE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes

const Accounts = () => {
  const queryClient = useQueryClient();
  const { data: linkedAccounts, isLoading } = useQuery({
    queryKey: ["linkedAccounts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      return userData?.user ? fetchLinkedAccounts(userData.user.id) : [];
    },
    staleTime: STALE_THRESHOLD_MS,
  });

  const [showModal, setShowModal] = useState(false);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [accountName, setAccountName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [manualResyncStatus, setManualResyncStatus] = useState<{
    [key: string]: "idle" | "syncing" | "done";
  }>({});

  useEffect(() => {
    localStorage.removeItem("tempLinkedAccount");
  }, []);

  const handleAddAccount = () => {
    setShowModal(true);
  };

  const handleStartAuth = async (provider: "google" | "azure-ad") => {
    setPollingEnabled(true);
    window.open(
      `/accounts/link?provider=${provider}`,
      "_blank",
      "width=600,height=600"
    );
  };

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
        } else {
          localStorage.removeItem("tempLinkedAccount");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Updated function using the new utility function
  const handleLinkAccount = async () => {
    setSyncStatus("idle");
    try {
      setSyncStatus("syncing");
      await linkAccount(authData, accountName, selectedColor);
      console.log("Account linked successfully");
      setSyncStatus("done");
    } catch (error: any) {
      console.error("Error linking account:", error);
      alert(error.message);
      setSyncStatus("idle");
    } finally {
      // Reset state and clean up
      setAuthData(null);
      setShowModal(false);
      setAccountName("");
      setSelectedColor("#ffffff");
      setPollingEnabled(false);
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
    <div className="min-h-screen">
      {isLoading ? (
        <p className="text-white/40">Loading accounts...</p>
      ) : (
        <div className="space-y-8">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h1 className="text-[22px] font-medium">Accounts</h1>
              <p className="text-sm text-white/40">
                View and manage all your linked accounts
              </p>
            </div>
            <Button size="base" variant="outline" className="w-fit gap-1">
              <PlusIcon className="w-4 h-4" />
              Add Account
            </Button>
          </div>
          <div className="h-[1px] w-full bg-gradient-to-r from-overlay-5 via-overlay-15 to-overlay-5"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(linkedAccounts || []).map((account: LinkedAccount) => (
              <div
                key={account.id}
                className="p-4 bg-overlay-5 border-[1px] border-overlay-10 rounded-xl flex flex-col items-center gap-2 relative"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: account.color || "#ffffff" }}
                  />
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-overlay-15">
                    <Image
                      src={
                        account.provider === "google"
                          ? googleIcon
                          : microsoftIcon
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
              className="cursor-pointer border-2 border-dotted border-overlay-15 hover:border-overlay-30 hover:bg-overlay-5 group transition-all duration-300 flex items-center justify-center rounded-xl p-4 min-h-40"
            >
              <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-all duration-300 ease-in-out" />
            </div>
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
