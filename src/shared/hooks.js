/** Cross-game React hooks (layout, balance timing). */
import { useEffect, useRef, useState } from "react";
import { gameShellMobilePanelQuery } from "./breakpoints.js";

export function useGameShellBettingPanelLayout() {
  const [layout, setLayout] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return "desktop";

    return window.matchMedia(gameShellMobilePanelQuery).matches ? "mobile" : "desktop";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia(gameShellMobilePanelQuery);
    const handleChange = () => setLayout(mediaQuery.matches ? "mobile" : "desktop");

    handleChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);

      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);

    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return layout;
}

export function useDeferredWinCredit(setBalance) {
  const pendingWinCreditRef = useRef(0);
  const [pendingWinCredit, setPendingWinCredit] = useState(0);

  const deferWinCredit = (amount) => {
    const nextAmount = Number(amount) || 0;
    pendingWinCreditRef.current = nextAmount;
    setPendingWinCredit(nextAmount);
  };

  const applyDeferredWinCredit = () => {
    const amount = pendingWinCreditRef.current;
    if (amount <= 0) {
      return;
    }

    pendingWinCreditRef.current = 0;
    setPendingWinCredit(0);
    setBalance((currentBalance) => currentBalance + amount);
  };

  const getDisplayBalance = (balance) => Number(balance) + pendingWinCredit;

  return {
    deferWinCredit,
    applyDeferredWinCredit,
    pendingWinCredit,
    getDisplayBalance,
  };
}
