import { WinModalCard } from "@joker/design-system";
import { formatJkcAmount } from "./formatting.js";

export function GameWinModalCard({
  profit,
  balance,
  className,
  message = "Your winnings have been credited to your account",
  messageHighlight = "credited",
  onClose,
  onCoinsLand,
  ...props
}) {
  const resolvedAmountWon =
    profit != null ? `+${formatJkcAmount(profit)}` : undefined;
  const resolvedBalance =
    balance != null && profit != null
      ? formatJkcAmount(Number(balance) + Number(profit))
      : balance != null
        ? formatJkcAmount(balance)
        : undefined;

  return (
    <WinModalCard
      {...props}
      amountWon={resolvedAmountWon}
      currency="JKC"
      balance={resolvedBalance}
      message={message}
      messageHighlight={messageHighlight}
      closeLabel="Close"
      className={className}
      onClose={onClose}
      onCoinsLand={onCoinsLand}
    />
  );
}
