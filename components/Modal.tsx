"use client";

import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  zIndex = 1000,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal"
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex }}
        >
          {/* Overlay animates its background color (not opacity) */}
          <motion.div
            key="overlay"
            className="absolute inset-0"
            onClick={onClose}
            initial={{ backgroundColor: "rgba(10,11,15,0)" }}
            animate={{ backgroundColor: "rgba(10,11,15,0.9)" }}
            exit={{ backgroundColor: "rgba(10,11,15,0)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* Modal content floats in from the bottom */}
          <motion.div
            key="content"
            className="relative shadow-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
