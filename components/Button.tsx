"use client";

import cn from "@/utils/cn";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "solid" | "outline";
  size?: "base";
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
    "rounded-full font-medium w-full flex items-center justify-center cursor-pointer",
    {
      "bg-white/95 text-background hover:bg-white": variant === "solid",
      "px-3 py-2 text-sm gap-3": size === "base",
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
