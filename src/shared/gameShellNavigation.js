import { withBase } from "./routing.js";

/** Standard top-rail / side-rail props for GameShell from @joker/design-system. */
export function gameShellNavigationProps(navigationPreset, { balance, onGameChange } = {}) {
  return {
    balance,
    logoHref: withBase("/"),
    defaultValue: navigationPreset.defaultValue,
    value: navigationPreset.selectedValue,
    game: navigationPreset.game,
    onValueChange: onGameChange,
  };
}
