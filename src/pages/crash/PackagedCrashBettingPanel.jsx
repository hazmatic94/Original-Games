import { CrashBettingPanel as JokerCrashBettingPanel } from "@joker/design-system";
import { sanitizeBetAmountInput } from "../../shared/formatting.js";

export function PackagedCrashBettingPanel({
  betAmount,
  bettingMode,
  gameInPlay,
  layout = "desktop",
  numberOfBets,
  onBetAmountChange,
  onModeChange,
  onNumberOfBetsChange,
  onPlaceBet,
}) {
  function handleBetAmountChange(event) {
    onBetAmountChange(sanitizeBetAmountInput(event.currentTarget.value));
  }

  function handleNumberOfBetsChange(event) {
    onNumberOfBetsChange(event.currentTarget.value.replace(/\D/g, ""));
  }

  return (
    <JokerCrashBettingPanel
      layout={layout}
      className={gameInPlay ? "is-crash-active" : ""}
      mode={bettingMode}
      onModeChange={onModeChange}
      onPlaceBet={onPlaceBet}
      betAmount={betAmount}
      onBetAmountChange={handleBetAmountChange}
      numberOfBets={numberOfBets}
      onNumberOfBetsChange={handleNumberOfBetsChange}
      disablePlaceBetUntilBetAmount
    />
  );
}
