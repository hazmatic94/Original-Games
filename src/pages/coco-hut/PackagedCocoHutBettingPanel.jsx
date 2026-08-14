import { CocoHutBettingPanel as JokerCocoHutBettingPanel } from "@joker/design-system";
import { sanitizeBetAmountInput } from "../../shared/formatting.js";

export function PackagedCocoHutBettingPanel({
  betAmount,
  difficulty,
  layout = "desktop",
  onBetAmountChange,
  onDifficultyChange,
  onPlaceBet,
}) {
  function handleBetAmountChange(event) {
    onBetAmountChange(sanitizeBetAmountInput(event.currentTarget.value));
  }

  return (
    <JokerCocoHutBettingPanel
      layout={layout}
      betAmount={betAmount}
      difficulty={difficulty}
      onBetAmountChange={handleBetAmountChange}
      onDifficultyChange={onDifficultyChange}
      onPlaceBet={onPlaceBet}
      disablePlaceBetUntilBetAmount
    />
  );
}
