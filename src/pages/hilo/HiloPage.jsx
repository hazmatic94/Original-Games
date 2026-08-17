import { useEffect, useRef, useState } from "react";
import {
  BettingPanelSurface,
  Button,
  CashoutFooter,
  GameShell,
  OddsButtonGroup,
} from "@joker/design-system";
import "@joker/design-system/styles/button.css";
import "@joker/design-system/styles/inputs.css";
import hiloCardDrawSound from "../../../assets/hilo-card-draw.mp3?url";
import hiloCardLandSound from "../../../assets/hilo-card-land.mp3?url";
import {
  GAME_ROUND_END_RESET_MS,
  GAME_ROUND_END_STYLES,
} from "../../shared/gameRoundEnd.jsx";
import { formatBalance, sanitizeBetAmountInput } from "../../shared/formatting.js";
import { cancelSoundCues, playCashoutSound, playFoley, playPlaceBetSound, playResolveCue } from "../../shared/gameSounds.js";
import { GameWinModalCard } from "../../shared/GameWinModalCard.jsx";
import { useDeferredWinCredit, useGameShellBettingPanelLayout } from "../../shared/hooks.js";
import { gameShellNavigationProps } from "../../shared/gameShellNavigation.js";
import { HiloStage } from "./HiloStage.jsx";
import { hiloNavigationPreset } from "./hiloConfig.js";
import {
  calculateHiloOdds,
  calculateProjectedHiloMultiplier,
  createHiloHistoryEntry,
  createHiloPreviewState,
  createHiloRound,
  formatHiloPercent,
  getHiloDisplayOdds,
  getInitialHiloPreview,
  runHiloPrediction,
  updateHiloHistory,
} from "./hiloGameLogic.js";
import { getHiloPageStyles } from "./hiloPageStyles.js";

const HILO_CARD_LAND_MS = 400;

export function HiloPage({ onGameChange }) {
  const [betAmount, setBetAmount] = useState("");
  const [balance, setBalance] = useState(150000);
  const { deferWinCredit, applyDeferredWinCredit, getDisplayBalance } = useDeferredWinCredit(setBalance);
  const [currentCard, setCurrentCard] = useState(() => getInitialHiloPreview().currentCard);
  const [deck, setDeck] = useState([]);
  const [history, setHistory] = useState(() => getInitialHiloPreview().history);
  const [multiplier, setMultiplier] = useState(1);
  const [roundStatus, setRoundStatus] = useState("pre-game");
  const [pendingPrediction, setPendingPrediction] = useState("");
  const [skipAvailable, setSkipAvailable] = useState(true);
  const [hiloWinModal, setHiloWinModal] = useState(null);
  const hiloRoundResetTimeoutRef = useRef(null);
  const hiloHistoryLengthRef = useRef(history.length);

  const bettingPanelLayout = useGameShellBettingPanelLayout();
  const numericBetAmount = Number(betAmount) || 0;
  const hasBetAmount = numericBetAmount > 0;
  const gameInPlay = roundStatus === "active";
  const gameOdds = calculateHiloOdds(currentCard, deck);
  const displayOdds = getHiloDisplayOdds(currentCard, deck);
  const lowerMultiplier = calculateProjectedHiloMultiplier(
    multiplier,
    gameOdds.lowerProbability
  );
  const higherMultiplier = calculateProjectedHiloMultiplier(
    multiplier,
    gameOdds.higherProbability
  );
  const currentProfit = multiplier > 1 ? numericBetAmount * multiplier : 0;

  useEffect(() => {
    return () => {
      if (hiloRoundResetTimeoutRef.current) {
        window.clearTimeout(hiloRoundResetTimeoutRef.current);
      }
      cancelSoundCues();
    };
  }, []);

  useEffect(() => {
    if (!gameInPlay) {
      hiloHistoryLengthRef.current = history.length;
      return;
    }

    if (history.length > hiloHistoryLengthRef.current) {
      setPendingPrediction("");
    }

    hiloHistoryLengthRef.current = history.length;
  }, [gameInPlay, history.length]);

  function clearHiloRoundResetTimer() {
    if (hiloRoundResetTimeoutRef.current) {
      window.clearTimeout(hiloRoundResetTimeoutRef.current);
      hiloRoundResetTimeoutRef.current = null;
    }
  }

  function playHiloDrawSound() {
    playFoley(hiloCardDrawSound);
  }

  function scheduleHiloCardLand(outcome, { opening = false } = {}) {
    const sting =
      outcome === "loss" ? "loss" : outcome === "win" ? "cashout" : outcome === "active" ? "multiplier" : null;

    playResolveCue({
      opening,
      foley: hiloCardLandSound,
      foleyAt: opening ? 520 : HILO_CARD_LAND_MS,
      sting,
    });
  }

  function resetHiloRound() {
    clearHiloRoundResetTimer();
    cancelSoundCues();
    const preview = createHiloPreviewState();
    setCurrentCard(preview.currentCard);
    setDeck([]);
    setHistory(preview.history);
    setMultiplier(1);
    setRoundStatus("pre-game");
    setPendingPrediction("");
    setSkipAvailable(true);
    setHiloWinModal(null);
  }

  function scheduleHiloRoundReset() {
    clearHiloRoundResetTimer();
    hiloRoundResetTimeoutRef.current = window.setTimeout(() => {
      hiloRoundResetTimeoutRef.current = null;
      resetHiloRound();
    }, GAME_ROUND_END_RESET_MS);
  }

  function closeHiloWinModal() {
    clearHiloRoundResetTimer();
    applyDeferredWinCredit();
    setHiloWinModal(null);
    resetHiloRound();
  }

  function showHiloWinModal({ title, profit }) {
    setHiloWinModal({ title, profit });
  }

  function handleHiloWinModalClose() {
    closeHiloWinModal();
  }

  function handleBetAmountChange(nextValue) {
    setBetAmount(nextValue);

    if (!Number(nextValue)) {
      setPendingPrediction("");
    }
  }

  function handleBetAmountInputChange(event) {
    handleBetAmountChange(sanitizeBetAmountInput(event.currentTarget.value));
  }

  function handleHiloChoiceSelection(choice) {
    if (gameInPlay) {
      setPendingPrediction(choice);
      handlePrediction(choice);
      return;
    }

    if (roundStatus === "pre-game" && hasBetAmount) {
      setPendingPrediction(choice);
    }
  }

  function handlePlaceBet() {
    if (gameInPlay) return;

    if (!hasBetAmount || numericBetAmount > balance || !pendingPrediction) {
      return;
    }

    clearHiloRoundResetTimer();
    setHiloWinModal(null);

    playPlaceBetSound();

    const nextRound = createHiloRound(currentCard);

    setBalance((currentBalance) => currentBalance - numericBetAmount);
    setSkipAvailable(true);

    if (pendingPrediction) {
      const choice = pendingPrediction;
      const roundOdds = calculateHiloOdds(nextRound.currentCard, nextRound.deck);
      const result = runHiloPrediction(choice, {
        currentCard: nextRound.currentCard,
        deck: nextRound.deck,
        history: nextRound.history,
        multiplier: 1,
        odds: roundOdds,
        stake: numericBetAmount,
      });

      setPendingPrediction("");

      if (result) {
        setCurrentCard(result.currentCard);
        setDeck(result.deck);
        setHistory(result.history);
        setMultiplier(result.multiplier);
        setRoundStatus(result.roundStatus);

        scheduleHiloCardLand(result.roundStatus, { opening: true });

        if (result.roundStatus === "win") {
          deferWinCredit(result.winProfit);
          showHiloWinModal({
            title: "You Won",
            profit: result.winProfit,
          });
          return;
        }

        if (result.roundStatus === "loss") {
          scheduleHiloRoundReset();
          return;
        }

        return;
      }
    }

    setCurrentCard(nextRound.currentCard);
    setDeck(nextRound.deck);
    setHistory(nextRound.history);
    setMultiplier(1);
    setRoundStatus("active");
  }

  function handleCashout() {
    if (!gameInPlay || currentProfit <= 0) {
      return;
    }

    deferWinCredit(currentProfit);
    setRoundStatus("cash-out");
    playCashoutSound();
    showHiloWinModal({
      title: "Cashout Successful",
      profit: currentProfit,
    });
  }

  function handlePrediction(choice) {
    if (!gameInPlay || deck.length === 0) {
      return;
    }

    playHiloDrawSound();

    const result = runHiloPrediction(choice, {
      currentCard,
      deck,
      history,
      multiplier,
      odds: gameOdds,
      stake: numericBetAmount,
    });

    if (!result) {
      return;
    }

    setCurrentCard(result.currentCard);
    setDeck(result.deck);
    setHistory(result.history);
    setMultiplier(result.multiplier);
    setRoundStatus(result.roundStatus);
    scheduleHiloCardLand(result.roundStatus);

    if (result.roundStatus === "win") {
      deferWinCredit(result.winProfit);
      showHiloWinModal({
        title: "You Won",
        profit: result.winProfit,
      });
      return;
    }

    if (result.roundStatus === "loss") {
      scheduleHiloRoundReset();
    }
  }

  function handleSkipCard() {
    if (roundStatus === "pre-game") {
      playHiloDrawSound();
      scheduleHiloCardLand();
      const preview = createHiloPreviewState();
      setCurrentCard(preview.currentCard);
      setHistory(preview.history);
      return;
    }

    if (!gameInPlay || !skipAvailable || deck.length === 0) {
      return;
    }

    playHiloDrawSound();

    const [nextCard, ...remainingDeck] = deck;
    const autoWin = remainingDeck.length === 0 && currentProfit > 0;

    scheduleHiloCardLand(autoWin ? "win" : undefined);

    setCurrentCard(nextCard);
    setDeck(remainingDeck);
    setHistory((currentHistory) =>
      updateHiloHistory(
        currentHistory,
        "skip",
        createHiloHistoryEntry(nextCard, "Skip", "skip")
      )
    );
    setSkipAvailable(false);

    if (autoWin) {
      deferWinCredit(currentProfit);
      setRoundStatus("win");
      showHiloWinModal({
        title: "You Won",
        profit: currentProfit,
      });
    }
  }

  const isMobileBettingPanel = bettingPanelLayout === "mobile";
  const awaitingHiloChoice = !gameInPlay && hasBetAmount && !pendingPrediction;
  const oddsDisabled = !gameInPlay && !hasBetAmount;
  const panelClassName = [
    "joker-hilo-betting-panel",
    !gameInPlay ? "is-hilo-pre-game" : "",
    !gameInPlay && hasBetAmount ? "is-hilo-pre-game-ready" : "",
    awaitingHiloChoice ? "is-awaiting-hilo-choice" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <style>{getHiloPageStyles(GAME_ROUND_END_STYLES)}</style>
      <GameShell
        {...gameShellNavigationProps(hiloNavigationPreset, {
          balance: formatBalance(getDisplayBalance(balance)),
          onGameChange,
        })}
        className="joker-game-shell--hilo"
        bettingPanel={
          <BettingPanelSurface
            ariaLabel={
              isMobileBettingPanel ? "HiLo mobile betting panel" : "HiLo betting panel"
            }
            className={panelClassName}
            layout={bettingPanelLayout}
            betAmount={betAmount}
            onBetAmountChange={handleBetAmountInputChange}
            onPlaceBet={handlePlaceBet}
            disablePlaceBetUntilBetAmount
            footer={
              gameInPlay ? <CashoutFooter onCashout={handleCashout} /> : undefined
            }
          >
            <div className="joker-hilo-betting-actions joker-betting-field-group">
              <OddsButtonGroup
                ariaLabel="HiLo choice"
                layout="stacked"
                showOdds={false}
                showDirection
                value={oddsDisabled ? "" : pendingPrediction}
                onValueChange={(value) => {
                  if (oddsDisabled) return;
                  setPendingPrediction(value);
                }}
                disabled={oddsDisabled}
                options={[
                  {
                    value: "lower",
                    label: "Lower / Same",
                    odds: formatHiloPercent(displayOdds.lowerPercent),
                    direction: "down",
                    onClick: () => handleHiloChoiceSelection("lower"),
                  },
                  {
                    value: "higher",
                    label: "Higher / Same",
                    odds: formatHiloPercent(displayOdds.higherPercent),
                    direction: "up",
                    onClick: () => handleHiloChoiceSelection("higher"),
                  },
                ]}
              />

              {gameInPlay ? (
                <Button
                  variant="secondary"
                  fullWidth
                  className="joker-cta-preview secondary full-width"
                  onClick={handleSkipCard}
                >
                  {skipAvailable ? "Skip Card" : "Skip Used"}
                </Button>
              ) : null}
            </div>
          </BettingPanelSurface>
        }
      >
        <HiloStage
          bettingPanelLayout={bettingPanelLayout}
          cardsRemaining={deck.length}
          currentCard={currentCard}
          hasBetAmount={hasBetAmount}
          higherMultiplier={higherMultiplier}
          higherOdds={formatHiloPercent(displayOdds.higherPercent)}
          history={history}
          lowerMultiplier={lowerMultiplier}
          lowerOdds={formatHiloPercent(displayOdds.lowerPercent)}
          onHigherSame={() => handleHiloChoiceSelection("higher")}
          onLowerSame={() => handleHiloChoiceSelection("lower")}
          onSkipCard={handleSkipCard}
          balance={balance}
          onWinModalClose={handleHiloWinModalClose}
          onWinCoinsLand={applyDeferredWinCredit}
          pendingPrediction={pendingPrediction}
          roundStatus={roundStatus}
          skipAvailable={skipAvailable}
          winModal={hiloWinModal}
        />
      </GameShell>
    </>
  );
}
