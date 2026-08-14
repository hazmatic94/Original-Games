import { useEffect, useRef } from "react";
import { playResolveCue } from "../../shared/gameSounds.js";
import { burstRouletteWinParticles } from "./rouletteWheelCelebration.js";
import { ROULETTE_WHEEL_CELEBRATION_STYLES } from "./rouletteWheelCelebrationStyles.js";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function RouletteWheelCelebration({
  active = false,
  variant = "win",
  playWinSting = true,
  soundEnabled = true,
  size = 560,
  children,
  className = "",
  style,
  ...props
}) {
  const particlesRef = useRef(null);

  useEffect(() => {
    if (!active || variant !== "win") {
      return;
    }

    burstRouletteWinParticles(particlesRef.current);

    if (soundEnabled) {
      playResolveCue({
        opening: !playWinSting,
        sting: "multiplier",
      });
    }
  }, [active, variant, playWinSting, soundEnabled]);

  useEffect(() => {
    if (!active || variant !== "lose" || !soundEnabled) {
      return;
    }

    playResolveCue({ sting: "loss" });
  }, [active, variant, soundEnabled]);

  const rootStyle = {
    "--roulette-wheel-size": `${size}px`,
    ...style,
  };

  return (
    <>
      <style>{ROULETTE_WHEEL_CELEBRATION_STYLES}</style>
      <div
        {...props}
        className={cx("joker-roulette-wheel-composition", className)}
        style={rootStyle}
        data-win-active={active && variant === "win" ? "" : undefined}
        data-lose-active={active && variant === "lose" ? "" : undefined}
      >
        <div className="joker-roulette-wheel-win__backdrop" aria-hidden="true">
          <div
            className={cx(
              "joker-roulette-wheel-win__glow",
              variant === "lose" && "joker-roulette-wheel-win__glow--lose",
            )}
          />
          <div className="joker-roulette-wheel-win__fx">
            <div ref={particlesRef} className="joker-roulette-wheel-win__particles" />
          </div>
        </div>
        <div className="joker-roulette-wheel-composition__wheel">{children}</div>
      </div>
    </>
  );
}
