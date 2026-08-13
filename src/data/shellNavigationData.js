export { navigationIconAssets } from "../../../Joker-DS/src/data/navigationIconAssets.js";
export {
  casinoGroupMenuItems,
  comingSoonGameMenuItems,
  mainNavGameLinkItems,
  mainNavHomeItems,
  mainNavSupportItems,
  navigationItemRegistry,
  promotionsGroupMenuItems,
  railSearchComingSoon,
  withComingSoon,
} from "../../../Joker-DS/src/data/navigationData.js";
import { gameMenuItems as designSystemGameMenuItems } from "../../../Joker-DS/src/data/navigationData.js";

export const gameMenuItems = designSystemGameMenuItems.filter(
  (item) => item.value !== "4d-mines" && item.icon !== "4d-mines",
);
