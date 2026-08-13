import { useEffect, useMemo, useRef, useState } from "react";
import {
  BettingPanelSurface,
  FourDMinesInGameCard,
  FourDNumberInput,
  GameShell,
  isValidFourDNumber,
  MinesInGameOverlay,
  normalizeFourDNumber,
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
import { calculateMultiplier } from "../mines/minesGameLogic.jsx";
import { FourDMinesGrid } from "./FourDMinesGrid.jsx";
import {
  desktopFourDMinesGrid,
  fourDMinesNavigationPreset,
  fourDMinesTileCount,
  minFourDMinesAmount,
  mobileFourDMinesGrid,
} from "./fourDMinesConfig.js";
import {
  clampFourDMinesAmount,
  countFourDSafeReveals,
  createFourDMineTiles,
  createFourDMinesAmountOptions,
  createFourDRoundBoard,
  getFourDTileContent,
  hasUniqueFourDDigits,
} from "./fourDMinesGameLogic.js";
import { getFourDMinesPageStyles } from "./fourDMinesPageStyles.js";

const dynamiteIcon = <img className="joker-dynamite-icon" src={dynamiteIconSrc} alt="" />;

function formatMinesAmountLabel(count) {
  return `${count} ${count === 1 ? "Mine" : "Mines"}`;
}

export function FourDMinesPage({ onGameChange }) {
  const bettingPanelLayout = useGameShellBettingPanelLayout();
  const fourDMinesGrid = bettingPanelLayout === "mobile" ? mobileFourDMinesGrid : desktopFourDMinesGrid;
  const fourDMinesAmountOptions = useMemo(() => createFourDMinesAmountOptions(), []);
  const mineTiles = useMemo(() => createFourDMineTiles(fourDMinesTileCount), []);
  const [betAmount, setBetAmount] = useState("");
  const [fourDNumber, setFourDNumber] = useState("");
  const [activeFourDNumber, setActiveFourDNumber] = useState("");
  const [balance, setBalance] = useState(150000);
  const { deferWinCredit, applyDeferredWinCredit, getDisplayBalance } = useDeferredWinCredit(setBalance);
  const [board, setBoard] = useState([]);
  const [message, setMessage] = useState("");
  const [mines, setMines] = useState(String(minFourDMinesAmount));
  const [revealedTiles, setRevealedTiles] = useState([]);
  const [freshRevealedTiles, setFreshRevealedTiles] = useState([]);
  const [roundStatus, setRoundStatus] = useState("idle");
  const [cashoutResult, setCashoutResult] = useState(null);
  const [lossResult, setLossResult] = useState(false);
  const resultResetTimeout = useRef(null);

  const activeMineCount = clampFourDMinesAmount(mines);
  const safeRevealedCount = countFourDSafeReveals(board, revealedTiles);
  const gameInPlay = roundStatus === "active";
  const multiplier = calculateMultiplier(fourDMinesTileCount, activeMineCount, safeRevealedCount);
  const nextMultiplier = calculateMultiplier(
    fourDMinesTileCount,
    activeMineCount,
    safeRevealedCount + 1
  );
  const numericBetAmount = Number(betAmount) || 0;
  const currentProfit =
    roundStatus === "active" && safeRevealedCount > 0
      ? numericBetAmount * multiplier
      : 0;
  const nextProfit = numericBetAmount * nextMultiplier;

  useOpenGameMenu(fourDMinesNavigationPreset.openMenuLabel);

  useEffect(() => {
    return () => {
      if (resultResetTimeout.current) {
        window.clearTimeout(resultResetTimeout.current);
      }
    };
  }, []);

  function clearResultTimer() {
    if (resultResetTimeout.current) {
      window.clearTimeout(resultResetTimeout.current);
      resultResetTimeout.current = null;
    }
  }

  function dismissCashoutResult() {
    setRoundStatus("idle");
    setBoard([]);
    setRevealedTiles([]);
    setFreshRevealedTiles([]);
    setCashoutResult(null);
    setLossResult(false);
    setMessage("");
    setFourDNumber("");
    setActiveFourDNumber("");
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

    const tileContent = getFourDTileContent(board[tile - 1]);

    setRevealedTiles((currentTiles) =>
      currentTiles.includes(tile) ? currentTiles : [...currentTiles, tile]
    );
    setFreshRevealedTiles((currentTiles) =>
      currentTiles.includes(tile) ? currentTiles : [...currentTiles, tile]
    );

    if (tileContent === "dynamite") {
      setRoundStatus("lost");
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

  function handleBetAction() {
    if (roundStatus === "cashedOut") {
      clearResultTimer();
      applyDeferredWinCredit();
      dismissCashoutResult();
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
      setLossResult(false);
      setMessage("");

      clearResultTimer();
      return;
    }

    if (numericBetAmount <= 0 || numericBetAmount > balance) {
      setMessage("Enter a valid bet amount");
      return;
    }

    if (!isValidFourDNumber(fourDNumber) || !hasUniqueFourDDigits(fourDNumber)) {
      setMessage("Enter a valid 4D number");
      return;
    }

    const normalizedFourDNumber = normalizeFourDNumber(fourDNumber);
    const nextBoard = createFourDRoundBoard(activeMineCount, normalizedFourDNumber);
    playPlaceBetSound();

    clearResultTimer();

    setBalance((currentBalance) => currentBalance - numericBetAmount);
    setActiveFourDNumber(normalizedFourDNumber);
    setBoard(nextBoard);
    setRoundStatus("active");
    setRevealedTiles([]);
    setFreshRevealedTiles([]);
    setCashoutResult(null);
    setLossResult(false);
    setMessage("");
  }

  function handleBetAmountChange(event) {
    setBetAmount(event.currentTarget.value.replace(/[^\d.]/g, ""));
  }

  function handleMinesAmountChange(nextValue) {
    setMines(String(clampFourDMinesAmount(nextValue)));
  }

  function handleFourDNumberChange(nextValue) {
    setFourDNumber(normalizeFourDNumber(nextValue));
  }

  const isMobileBettingPanel = bettingPanelLayout === "mobile";
  const fourDMinesInGameCard = (
    <FourDMinesInGameCard
      currentProfit={formatCurrency(currentProfit)}
      nextValue={formatCurrency(nextProfit)}
      currentMultiplier={`${multiplier.toFixed(2)}x`}
      nextMultiplier={`${nextMultiplier.toFixed(2)}x`}
    />
  );

  return (
    <>
      <style>{getFourDMinesPageStyles(GAME_ROUND_END_STYLES)}</style>
      <GameShell
        balance={formatBalance(getDisplayBalance(balance))}
        className="joker-game-shell--4d-mines"
        defaultValue={fourDMinesNavigationPreset.defaultValue}
        game={fourDMinesNavigationPreset.game}
        onValueChange={onGameChange}
        value={fourDMinesNavigationPreset.selectedValue}
        bettingPanel={
          <div
            className={
              gameInPlay && !isMobileBettingPanel
                ? "joker-4d-mines-betting-panel-host is-ingame"
                : "joker-4d-mines-betting-panel-host"
            }
          >
            <BettingPanelSurface
              ariaLabel={
                isMobileBettingPanel
                  ? "4D Mines mobile betting panel"
                  : "4D Mines betting panel"
              }
              className="joker-4d-mines-betting-panel"
              layout={bettingPanelLayout}
              betAmount={betAmount}
              onBetAmountChange={handleBetAmountChange}
              onPlaceBet={handleBetAction}
              inGame={gameInPlay}
              disablePlaceBetUntilBetAmount
              footer={
                gameInPlay && isMobileBettingPanel ? (
                  <MinesInGameOverlay layout={bettingPanelLayout} onCashout={handleBetAction}>
                    {fourDMinesInGameCard}
                  </MinesInGameOverlay>
                ) : undefined
              }
            >
              <div className="joker-4d-mines-betting-field-group joker-betting-field-group">
                <FourDNumberInput
                  className="joker-bet-field"
                  value={fourDNumber}
                  onChange={handleFourDNumberChange}
                  onValueChange={handleFourDNumberChange}
                />
                <Select
                  className="joker-bet-field joker-dynamite-input"
                  fullWidth
                  label="Dynamite"
                  leftIcon={dynamiteIcon}
                  options={fourDMinesAmountOptions}
                  value={mines}
                  onChange={handleMinesAmountChange}
                  renderValue={(option) => {
                    const count = Number.parseInt(option?.value ?? mines, 10);
                    return Number.isFinite(count) ? formatMinesAmountLabel(count) : option?.label;
                  }}
                />
              </div>
            </BettingPanelSurface>
            {gameInPlay && !isMobileBettingPanel ? (
              <MinesInGameOverlay
                className="joker-4d-mines-betting-panel-overlay"
                layout={bettingPanelLayout}
                onCashout={handleBetAction}
              >
                {fourDMinesInGameCard}
              </MinesInGameOverlay>
            ) : null}
          </div>
        }
      >
        <FourDMinesGrid
          balance={balance}
          board={board}
          cashoutResult={cashoutResult}
          columns={fourDMinesGrid.columns}
          freshRevealedTiles={freshRevealedTiles}
          lossResult={lossResult}
          multiplier={multiplier}
          onResultClose={handleResultClose}
          onWinCoinsLand={applyDeferredWinCredit}
          onTileClick={handleTileClick}
          playerFourDNumber={activeFourDNumber}
          revealedTiles={revealedTiles}
          roundStatus={roundStatus}
          rows={fourDMinesGrid.rows}
          tiles={mineTiles}
        />
      </GameShell>
    </>
  );
}
