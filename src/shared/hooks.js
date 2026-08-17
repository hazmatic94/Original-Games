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

const MOBILE_SHELL_SCROLLER = ".joker-navigation-mobile-content";
const GAME_HEADER_RAIL = ".joker-game-header-rail";

function scrollMobilePlayAreaIntoView() {
  const scroller = document.querySelector(MOBILE_SHELL_SCROLLER);
  const rail = scroller?.querySelector(GAME_HEADER_RAIL);
  if (!scroller || !rail) return;

  const nextTop =
    scroller.scrollTop +
    rail.getBoundingClientRect().bottom -
    scroller.getBoundingClientRect().top;

  scroller.scrollTo({
    top: Math.max(0, nextTop),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

/** After Place Bet on mobile, tuck the game header rail under the sticky nav so canvas + cashout fill the view. */
export function requestScrollMobilePlayAreaIntoView() {
  if (typeof window === "undefined" || !window.matchMedia?.(gameShellMobilePanelQuery).matches) {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(scrollMobilePlayAreaIntoView);
  });
}

/** After Place Bet on mobile, tuck the game header rail under the sticky nav so canvas + cashout fill the view. */
export function useScrollMobilePlayAreaOnBet(isInPlay) {
  const wasInPlayRef = useRef(Boolean(isInPlay));

  useEffect(() => {
    const started = Boolean(isInPlay) && !wasInPlayRef.current;
    wasInPlayRef.current = Boolean(isInPlay);
    if (!started) return undefined;
    requestScrollMobilePlayAreaIntoView();
    return undefined;
  }, [isInPlay]);
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
