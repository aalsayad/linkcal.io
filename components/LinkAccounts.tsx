import React from "react";
import Button from "./Button";
import { PlusIcon } from "@heroicons/react/24/outline";
import { signIn } from "next-auth/react";

const handleGoogleSignIn = () => {
  signIn("google");
};
const handleMicrosoftSignIn = () => {
  signIn("azure-ad");
};

const LinkAccounts = () => {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Add Calendar</h1>
        <p className="text-xs text-white/40">
          Connect your preferred calendar to get started
        </p>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <Button
          onClick={handleGoogleSignIn}
          size="base"
          variant="outline"
          className="w-fit gap-1 group"
        >
          <PlusIcon className="w-3 h-3 group-hover:rotate-90 group-hover:opacity-100 transition-all duration-500 opcity-40" />
          Link Google Account
        </Button>

        <Button
          onClick={handleMicrosoftSignIn}
          size="base"
          variant="outline"
          className="w-fit gap-1 group"
        >
          <PlusIcon className="w-3 h-3 group-hover:rotate-90 group-hover:opacity-100 transition-all duration-500 opcity-40" />
          Link Microsoft Account
        </Button>
      </div>
    </div>
  );
};

export default LinkAccounts;
