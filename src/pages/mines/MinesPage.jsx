import { useEffect, useMemo, useRef, useState } from "react";
import {
  GameShell,
  MinesBettingPanel,
} from "@joker/design-system";
import "@joker/design-system/styles/button.css";
import "@joker/design-system/styles/inputs.css";
import {
  GAME_ROUND_END_RESET_MS,
  GAME_ROUND_END_STYLES,
} from "../../shared/gameRoundEnd.jsx";
import { formatBalance, formatCurrency, sanitizeBetAmountInput } from "../../shared/formatting.js";
import { playCashoutSound, playPlaceBetSound, playResolveCue } from "../../shared/gameSounds.js";
import { useDeferredWinCredit, useGameShellBettingPanelLayout } from "../../shared/hooks.js";
import { gameShellNavigationProps } from "../../shared/gameShellNavigation.js";
import { MinesGrid } from "./MinesGrid.jsx";
import {
  desktopMinesGrid,
  minTileAmount,
  minesNavigationPreset,
  mobileMinesGrid,
} from "./minesConfig.js";
import {
  blockTileWithShield,
  calculateMultiplier,
  clampTileAmount,
  countSafeReveals,
  createMineTiles,
  createMinesAmountOptions,
  createRoundBoard,
  getTileContent,
} from "./minesGameLogic.jsx";
import { getMinesPageStyles } from "./minesPageStyles.js";

export function MinesPage({ onGameChange }) {
  const bettingPanelLayout = useGameShellBettingPanelLayout();
  const minesGrid = bettingPanelLayout === "mobile" ? mobileMinesGrid : desktopMinesGrid;
  const minesTileCount = minesGrid.columns * minesGrid.rows;
  const maxTileAmount = minesTileCount - 1;
  const mineTiles = useMemo(() => createMineTiles(minesTileCount), [minesTileCount]);
  const minesAmountOptions = useMemo(
    () => createMinesAmountOptions(maxTileAmount),
    [maxTileAmount]
  );
  const [betAmount, setBetAmount] = useState("");
  const [balance, setBalance] = useState(150000);
  const { deferWinCredit, applyDeferredWinCredit, getDisplayBalance } = useDeferredWinCredit(setBalance);
  const [board, setBoard] = useState([]);
  const [message, setMessage] = useState("");
  const [mines, setMines] = useState(String(minTileAmount));
  const [revealedTiles, setRevealedTiles] = useState([]);
  const [freshRevealedTiles, setFreshRevealedTiles] = useState([]);
  const [roundStatus, setRoundStatus] = useState("idle");
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldUsed, setShieldUsed] = useState(false);
  const [cashoutResult, setCashoutResult] = useState(null);
  const [lossResult, setLossResult] = useState(false);
  const resultResetTimeout = useRef(null);

  const activeMineCount = clampTileAmount(mines, maxTileAmount);
  const safeRevealedCount = countSafeReveals(board, revealedTiles);
  const gameInPlay = roundStatus === "active";
  const multiplier = calculateMultiplier(minesTileCount, activeMineCount, safeRevealedCount);
  const nextMultiplier = calculateMultiplier(minesTileCount, activeMineCount, safeRevealedCount + 1);
  const numericBetAmount = Number(betAmount) || 0;
  const hasBetAmount = numericBetAmount > 0;
  const currentProfit =
    roundStatus === "active" && safeRevealedCount > 0
      ? numericBetAmount * multiplier
      : 0;
  const nextProfit = numericBetAmount * nextMultiplier;

  useEffect(() => {
    return () => {
      if (resultResetTimeout.current) {
        window.clearTimeout(resultResetTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    setMines((currentMines) => String(clampTileAmount(currentMines, maxTileAmount)));
    setBoard([]);
    setRevealedTiles([]);
    setFreshRevealedTiles([]);
    setRoundStatus("idle");
    setShieldActive(false);
    setShieldUsed(false);
    setCashoutResult(null);
    setLossResult(false);
    setMessage("");
  }, [maxTileAmount]);

  function clearResultTimer() {
    if (resultResetTimeout.current) {
      window.clearTimeout(resultResetTimeout.current);
      resultResetTimeout.current = null;
    }
  }

  function dismissCashoutResult() {
    applyDeferredWinCredit();
    setRoundStatus("idle");
    setBoard([]);
    setRevealedTiles([]);
    setFreshRevealedTiles([]);
    setCashoutResult(null);
    setLossResult(false);
    setShieldActive(false);
    setShieldUsed(false);
    setMessage("");
    resultResetTimeout.current = null;
  }

  function handleResultClose() {
    const shouldResetCashout = Boolean(cashoutResult);

    clearResultTimer();
    setLossResult(false);

    if (shouldResetCashout) {
      applyDeferredWinCredit();
      dismissCashoutResult();
      return;
    }

    setCashoutResult(null);
  }

  function handleTileClick(tile) {
    if (roundStatus !== "active" || revealedTiles.includes(tile)) {
      return;
    }

    const tileContent = getTileContent(board[tile - 1]);

    setRevealedTiles((currentTiles) =>
      currentTiles.includes(tile) ? currentTiles : [...currentTiles, tile]
    );
    setFreshRevealedTiles((currentTiles) =>
      currentTiles.includes(tile) ? currentTiles : [...currentTiles, tile]
    );

    if (tileContent === "joker") {
      setShieldActive(true);
      setMessage("Joker Shield Activated");
    }

    if (tileContent === "dynamite" && shieldActive) {
      setBoard((currentBoard) => blockTileWithShield(currentBoard, tile));
      setShieldActive(false);
      setShieldUsed(true);
      setMessage("Shield Saved You");
    }

    if (tileContent === "dynamite" && !shieldActive) {
      setRoundStatus("lost");
      setShieldActive(false);
      setLossResult(true);
      setMessage("");
      playResolveCue({ sting: "loss" });

      clearResultTimer();
      resultResetTimeout.current = window.setTimeout(
        dismissCashoutResult,
        GAME_ROUND_END_RESET_MS
      );
    }

    window.setTimeout(() => {
      setFreshRevealedTiles((currentTiles) =>
        currentTiles.filter((currentTile) => currentTile !== tile)
      );
    }, 1500);
  }

  function startNewRound(availableBalance = getDisplayBalance(balance)) {
    if (numericBetAmount <= 0 || numericBetAmount > availableBalance) {
      setMessage("Enter a valid bet amount");
      return false;
    }

    const nextBoard = createRoundBoard(activeMineCount, mineTiles);
    playPlaceBetSound();

    clearResultTimer();

    setBalance((currentBalance) => currentBalance - numericBetAmount);
    setBoard(nextBoard);
    setRoundStatus("active");
    setRevealedTiles([]);
    setFreshRevealedTiles([]);
    setShieldActive(false);
    setShieldUsed(false);
    setCashoutResult(null);
    setLossResult(false);
    setMessage("");
    return true;
  }

  function handleBetAction() {
    if (roundStatus === "cashedOut") {
      clearResultTimer();
      const availableBalance = getDisplayBalance(balance);
      applyDeferredWinCredit();
      dismissCashoutResult();
      startNewRound(availableBalance);
      return;
    }

    if (gameInPlay) {
      playCashoutSound();
      deferWinCredit(currentProfit);
      setCashoutResult({
        multiplier,
        profit: currentProfit,
      });
      setRoundStatus("cashedOut");
      setFreshRevealedTiles([]);
      setShieldActive(false);
      setShieldUsed(false);
      setLossResult(false);
      setMessage("");

      clearResultTimer();
      return;
    }

    startNewRound();
  }

  function handleBetAmountChange(event) {
    setBetAmount(sanitizeBetAmountInput(event.currentTarget.value));
  }

  function handleMinesAmountChange(nextValue) {
    setMines(String(clampTileAmount(nextValue, maxTileAmount)));
  }


  return (
    <>
      <style>{getMinesPageStyles(GAME_ROUND_END_STYLES)}</style>
      <GameShell
        {...gameShellNavigationProps(minesNavigationPreset, {
          balance: formatBalance(getDisplayBalance(balance)),
          onGameChange,
        })}
        className="joker-game-shell--mines"
        bettingPanel={
          <MinesBettingPanel
            betAmount={betAmount}
            disablePlaceBetUntilBetAmount
            inGame={gameInPlay}
            inGameCardProps={{
              currentMultiplier: `${multiplier.toFixed(2)}x`,
              currentProfit: formatCurrency(currentProfit),
              nextMultiplier: `${nextMultiplier.toFixed(2)}x`,
              nextValue: formatCurrency(nextProfit),
            }}
            layout={bettingPanelLayout}
            minesAmount={mines}
            minesAmountOptions={minesAmountOptions}
            onBetAmountChange={handleBetAmountChange}
            onCashout={handleBetAction}
            onMinesAmountChange={handleMinesAmountChange}
            onPlaceBet={handleBetAction}
          />
        }
      >
        <MinesGrid
          balance={balance}
          board={board}
          cashoutResult={cashoutResult}
          freshRevealedTiles={freshRevealedTiles}
          lossResult={lossResult}
          multiplier={multiplier}
          columns={minesGrid.columns}
          onResultClose={handleResultClose}
          onWinCoinsLand={applyDeferredWinCredit}
          onTileClick={handleTileClick}
          revealedTiles={revealedTiles}
          roundStatus={roundStatus}
          rows={minesGrid.rows}
          tiles={mineTiles}
        />
      </GameShell>
    </>
  );
}
