import { useEffect, useCallback } from "react";

const useClickOutside = <T extends HTMLElement>(
  ref: React.RefObject<T | null>, // Allow current to be T | null
  callback: () => void
) => {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    },
    [ref, callback]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [handleClick]);
};

export default useClickOutside;
