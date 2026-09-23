"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Splash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("quill-splash")) return;
    sessionStorage.setItem("quill-splash", "1");
    setShow(true);

    const hide = window.setTimeout(() => setShow(false), 1350);
    return () => window.clearTimeout(hide);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "#FAF6EB" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-label="Loading Quill"
        >
          <motion.img
            src="/quill-logo.svg"
            alt="Quill"
            className="h-auto w-[154px] sm:w-[176px]"
            draggable={false}
            initial={{ opacity: 0, scale: 0.94, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.58,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
