"use client";

import { useEffect } from "react";
import MemoPage from "./memo-page";

export default function IntelligencePage() {
  useEffect(() => {
    document.title = "Mimo · Quill";
  }, []);

  return <MemoPage />;
}
