"use client";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";

const Navbar = () => {
  const pathname = usePathname();
  const { data: userName, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      return user.user_metadata?.full_name || user.email;
    },
  });
  console.log(userName);

  return (
    <div className="w-full min-h-14 bg-overlay-5 border-b border-overlay-10">
      <div className="max-w-[1350px] mx-auto h-full flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs text-white pointer-events-none opacity-40 font-thin min-w-[200px]">
            <div>
              {isLoading ? (
                // Use invisible placeholder text so the width stays constant
                <span className="invisible">Placeholder Name</span>
              ) : (
                userName
              )}
            </div>
            <span className="text-white">
              <ChevronRightIcon className="w-2 h-2" />
            </span>
            <div className="capitalize">{pathname.split("/").pop()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
