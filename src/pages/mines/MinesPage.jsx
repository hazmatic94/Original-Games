import { useEffect, useMemo, useRef, useState } from "react";
import {
  BettingPanelSurface,
  GameShell,
  GoldNuggetsInput,
  MinesInGameCard,
  MinesInGameOverlay,
  Select,
} from "@joker/design-system";
import "@joker/design-system/styles/button.css";
import "@joker/design-system/styles/inputs.css";
import dynamiteIconSrc from "../../../assets/mines-bomb.png?url";
import {
  GAME_ROUND_END_RESET_MS,
  GAME_ROUND_END_STYLES,
} from "../../shared/gameRoundEnd.jsx";
import { formatBalance, formatCurrency } from "../../shared/formatting.js";
import { playCashoutSound, playLossSound, playPlaceBetSound } from "../../shared/gameSounds.js";
import { useDeferredWinCredit, useGameShellBettingPanelLayout, useOpenGameMenu } from "../../shared/hooks.js";
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

const dynamiteIcon = <img className="joker-dynamite-icon" src={dynamiteIconSrc} alt="" />;

function formatMinesAmountLabel(count) {
  return `${count} ${count === 1 ? "Mine" : "Mines"}`;
}

function getGoldNuggets(mines, tileCount) {
  const minesCount = Number.parseInt(mines, 10);

  if (!Number.isFinite(minesCount)) {
    return String(tileCount - 1);
  }

  return String(Math.max(0, tileCount - minesCount));
}

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

  useOpenGameMenu(minesNavigationPreset.openMenuLabel);

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
      playLossSound();

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
    setBetAmount(event.currentTarget.value.replace(/[^\d.]/g, ""));
  }

  function handleMinesAmountChange(nextValue) {
    setMines(String(clampTileAmount(nextValue, maxTileAmount)));
  }

  const isMobileBettingPanel = bettingPanelLayout === "mobile";
  const minesInGameCard = (
    <MinesInGameCard
      currentProfit={formatCurrency(currentProfit)}
      nextValue={formatCurrency(nextProfit)}
      currentMultiplier={`${multiplier.toFixed(2)}x`}
      nextMultiplier={`${nextMultiplier.toFixed(2)}x`}
    />
  );

  return (
    <>
      <style>{getMinesPageStyles(GAME_ROUND_END_STYLES)}</style>
      <GameShell
        balance={formatBalance(getDisplayBalance(balance))}
        className="joker-game-shell--mines"
        defaultValue={minesNavigationPreset.defaultValue}
        game={minesNavigationPreset.game}
        onValueChange={onGameChange}
        value={minesNavigationPreset.selectedValue}
        bettingPanel={
          <div
            className={
              gameInPlay && !isMobileBettingPanel
                ? "joker-mines-betting-panel-host is-ingame"
                : "joker-mines-betting-panel-host"
            }
          >
            <BettingPanelSurface
              ariaLabel={
                isMobileBettingPanel
                  ? "Mines mobile betting panel"
                  : "Mines betting panel"
              }
              className="joker-mines-betting-panel"
              layout={bettingPanelLayout}
              betAmount={betAmount}
              onBetAmountChange={handleBetAmountChange}
              onPlaceBet={handleBetAction}
              inGame={gameInPlay}
              disablePlaceBetUntilBetAmount
              footer={
                gameInPlay && isMobileBettingPanel ? (
                  <MinesInGameOverlay layout={bettingPanelLayout} onCashout={handleBetAction}>
                    {minesInGameCard}
                  </MinesInGameOverlay>
                ) : undefined
              }
            >
              <div className="joker-mines-betting-field-group joker-betting-field-group">
                <Select
                  className="joker-bet-field joker-dynamite-input"
                  fullWidth
                  label="Dynamite"
                  leftIcon={dynamiteIcon}
                  options={minesAmountOptions}
                  value={mines}
                  onChange={handleMinesAmountChange}
                  renderValue={(option) => {
                    const count = Number.parseInt(option?.value ?? mines, 10);
                    return Number.isFinite(count) ? formatMinesAmountLabel(count) : option?.label;
                  }}
                />
                <GoldNuggetsInput
                  className="joker-bet-field"
                  fullWidth
                  label="Gold bars"
                  value={getGoldNuggets(mines, minesTileCount)}
                />
              </div>
            </BettingPanelSurface>
            {gameInPlay && !isMobileBettingPanel ? (
              <MinesInGameOverlay
                className="joker-mines-betting-panel-overlay"
                layout={bettingPanelLayout}
                onCashout={handleBetAction}
              >
                {minesInGameCard}
              </MinesInGameOverlay>
            ) : null}
          </div>
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
