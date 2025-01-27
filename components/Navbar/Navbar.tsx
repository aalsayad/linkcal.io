import UserMenu from "./UserMenu";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import linkcalLogo from "@/public/linkcal.svg";

const Navbar = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // console.log("User Details:", user);
  // Generate UI Avatar URL if no imageUrl is provided
  const avatarUrl =
    user.user_metadata?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.user_metadata?.full_name || user.email
    )}&size=128&background=random&rounded=true`;

  return (
    <div className="fixed h-14 border-b-[1px] border-b-overlay-10 bg-overlay-5/50 w-full backdrop-blur-lg z-50">
      <div className="max-w-[1300px] mx-auto h-full flex items-center justify-between px-8">
        <Image alt="Linkcal Logo" className="w-14" src={linkcalLogo} />
        <UserMenu
          user={{
            name: user.user_metadata?.full_name || user.email,
            email: user.email || "hi@mail.com",
          }}
          imageUrl={avatarUrl}
        />
      </div>
    </div>
  );
};

export default Navbar;
