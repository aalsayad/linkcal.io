import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowPathIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { parseUtcTimestamp } from "@/utils/formatDate";
import googleIcon from "@/public/logos/googlecalendar_logo.svg";
import microsoftIcon from "@/public/logos/microsoftcalendar_logo.svg";
import { LinkedAccount } from "@/db/schema";
import useClickOutside from "@/hooks/useClickOutside";
import cn from "@/utils/cn";

interface AccountCardProps {
  account: LinkedAccount;
  manualResyncStatus: { [key: string]: string };
  handleUnlinkAccount: (accountId: string) => void;
  handleResyncAccount: (account: LinkedAccount) => Promise<void> | void;
}

interface DropdownItemProps {
  onClick: () => void;
  label: string;
  Icon: React.ElementType;
  extraClasses?: string;
  disabled?: boolean;
  iconClassName?: string;
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  onClick,
  label,
  Icon,
  extraClasses = "",
  disabled = false,
  iconClassName = "",
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full text-left flex items-center gap-2 p-2 py-1.5 text-xs md:text-sm rounded-lg opacity-90 hover:opacity-100 hover:bg-white/5 transition-colors select-none duration-300",
      extraClasses,
      disabled && "cursor-not-allowed opacity-50"
    )}
  >
    <Icon className={cn("w-3 opacity-80", iconClassName)} />
    {label}
  </button>
);

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  manualResyncStatus,
  handleUnlinkAccount,
  handleResyncAccount,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicking outside.
  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  // Determine if this account is syncing.
  const isSyncing = manualResyncStatus[account.id] === "syncing";

  // Compute provider-specific labels and icons.
  const isGoogle = account.provider === "google";
  const providerLabel = isGoogle
    ? "Google Calendar"
    : "Microsoft Outlook Calendar";
  const providerIcon = isGoogle ? googleIcon : microsoftIcon;

  // Normalize last_synced so it’s always a Date (if it exists).
  const normalizedLastSynced =
    account.last_synced && !(account.last_synced instanceof Date)
      ? new Date(account.last_synced)
      : account.last_synced;
  const formattedLastSynced = normalizedLastSynced
    ? (() => {
        const parsedDate = parseUtcTimestamp(
          normalizedLastSynced.toISOString()
        );
        const datePart = parsedDate.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        });
        // toLocaleTimeString returns "3:00 AM"; remove the space before AM.
        const timePart = parsedDate
          .toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .replace(" ", "");
        return `${datePart} ${timePart}`;
      })()
    : null;

  // Determine webhook status.
  const webhookStatus = (() => {
    if (!account.webhook_resource_id) {
      return "disconnected";
    }
    if (account.webhook_expiration) {
      const expiration =
        account.webhook_expiration instanceof Date
          ? account.webhook_expiration
          : new Date(account.webhook_expiration);
      return expiration.getTime() < Date.now() ? "expired" : "connected";
    }
    return "disconnected";
  })();

  // Handlers
  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen((prev) => !prev);
  };

  const handleResync = () => {
    if (!isSyncing) {
      handleResyncAccount({ ...account, last_synced: normalizedLastSynced });
    }
  };

  return (
    <div className="p-4 bg-greybackground border-[1px] border-white/10 rounded-xl flex flex-col group relative overflow-hidden">
      {/* Colored border effect */}
      <div
        style={{ borderColor: account.color || "transparent" }}
        className="absolute h-full border-l-[1px] w-full rounded-xl left-0 top-0 pointer-events-none opacity-30 transition-all duration-[0.75s] group-hover:opacity-80"
      />

      {/* Header Section */}
      <div className="flex items-center justify-between w-full">
        {/* Provider Details */}
        <div className="flex items-center gap-2 text-xs">
          <Image
            src={providerIcon}
            alt="provider Icon"
            className="w-4"
            width={16}
            height={16}
          />
          <p className="opacity-50 font-light">{providerLabel}</p>
        </div>

        {/* Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={toggleDropdown}
            // Dropdown toggle remains clickable regardless of syncing.
            className="flex items-center justify-center w-7 h-7 bg-greybackground_light rounded-md cursor-pointer opacity-50 hover:opacity-100 border-[1px] border-white/10 transition-all duration-300"
          >
            <EllipsisHorizontalIcon className="w-4" />
          </button>
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="absolute top-full right-0 mt-2 min-w-[180px] bg-greybackground_light border border-white/10 shadow-lg rounded-lg z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1">
                  <DropdownItem
                    onClick={() => {
                      /* Implement Edit Account functionality */
                    }}
                    label="Edit Account"
                    Icon={PencilIcon}
                    disabled={isSyncing}
                  />
                  <DropdownItem
                    onClick={handleResync}
                    label={isSyncing ? "Resyncing..." : "Sync Meetings"}
                    Icon={ArrowPathIcon}
                    disabled={isSyncing}
                    iconClassName={isSyncing ? "animate-spin" : ""}
                  />
                  <DropdownItem
                    onClick={() => handleUnlinkAccount(account.id)}
                    label="Unlink"
                    Icon={TrashIcon}
                    extraClasses="text-red-400 hover:bg-red-200/5"
                    disabled={isSyncing}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Gradient Divider */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-3" />

      {/* Account Details Section */}
      <div className="flex flex-col gap-1">
        <div>
          <p className="text-[10px] opacity-30 font-light mb-0.5">Name</p>
          <p className="text-[16.5px] font-light">
            {account.account_name || account.email}
          </p>
        </div>
        <div>
          <p className="text-[10px] opacity-30 font-light mb-0.5">Email</p>
          <p className="text-[16.5px] font-light">{account.email}</p>
        </div>
      </div>

      {/* Spacer Divider
      <div className="w-full h-[1px] bg-transparent" /> */}

      {formattedLastSynced && (
        <p className="text-[10px] text-white/30 mt-6">
          <span className="opacity-70">Last synced:</span> {formattedLastSynced}
          <span className="mx-1 opacity-50">&bull;</span>
          <span className="opacity-70">Webhook:</span>{" "}
          <span className="capitalize">{webhookStatus}</span>
        </p>
      )}
    </div>
  );
};

export default AccountCard;
