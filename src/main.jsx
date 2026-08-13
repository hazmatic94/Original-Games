import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "@joker/design-system/styles.css";
import "@joker/design-system/styles/coin-receiver.css";
import "@joker/design-system/styles/coin.css";
import "@joker/design-system/styles/coin-toss.css";
import "./shared/hideFourDMinesNav.css";

createRoot(document.getElementById("root")).render(<App />);
