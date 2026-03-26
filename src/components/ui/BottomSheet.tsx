"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-3xl bg-clara-white shadow-lg flex flex-col"
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing flex-shrink-0"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-clara-border" />
            </div>

            {/* Content — scrollable with safe area padding for iPhone home bar */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)" }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
