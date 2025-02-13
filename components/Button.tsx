"use client";

import cn from "@/utils/cn";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "secondary" | "ghost";
  size?: "base" | "sm";
  disabled?: boolean;
  href?: string;
  className?: string;
  onClick?: () => Promise<void> | void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "solid",
  size = "base",
  disabled,
  href,
  className,
  onClick,
}) => {
  const buttonClass = cn(
    "rounded-lg font-medium w-fit flex items-center justify-center cursor-pointer",
    {
      "bg-white/95 text-background hover:bg-white": variant === "solid",
      "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-300":
        variant === "secondary",
      "bg-transparent border-[1px] border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 opacity-70 hover:opacity-100":
        variant === "outline",
      "bg-transparent hover:bg-overlay-10 transition-all duration-300":
        variant === "ghost",
      "p-2 text-sm gap-1": size === "base",
      "px-2.5 py-1.5 text-xs md:text-sm gap-1": size === "sm",
      "opacity-50 cursor-not-allowed": disabled,
    },
    className
  );

  return (
    <button onClick={onClick} className={buttonClass}>
      {children}
    </button>
  );
};

export default Button;
