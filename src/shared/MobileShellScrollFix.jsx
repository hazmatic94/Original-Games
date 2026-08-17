export function MobileShellScrollFix() {
  return (
    <style>
      {`
        html,
        body,
        #root {
          width: 100%;
          height: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        body {
          overflow: hidden;
          background: var(--joker-black-800);
        }

        #root > * {
          height: 100%;
          min-height: 0;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        #root::-webkit-scrollbar {
          display: none;
        }

        .joker-game-shell,
        .joker-game-shell * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .joker-game-shell *::-webkit-scrollbar {
          display: none;
        }

        .joker-game-shell .joker-game-shell-empty-stage > * {
          min-height: 100%;
        }

        @media (min-width: 1000px) {
          html,
          body,
          #root {
            min-height: 100dvh;
          }

          .joker-game-shell,
          .joker-game-shell[class*="shell"] {
            height: 100%;
            min-height: 100dvh;
            grid-template-rows: minmax(0, 1fr);
          }

          .joker-game-shell > .joker-navigation-shell {
            height: 100%;
            min-height: 0;
          }

          .joker-game-shell .joker-navigation,
          .joker-game-shell .joker-navigation-body,
          .joker-game-shell .joker-navigation-content {
            min-height: 0;
            height: 100%;
          }

          .joker-game-shell .joker-page-wrapper {
            align-items: stretch;
            align-self: stretch;
            height: 100%;
            min-height: 0;
            flex: 1 1 auto;
            padding: var(--game-shell-page-padding);
          }

          .joker-game-shell .joker-page-wrapper > .joker-game-inner-frame,
          .joker-game-shell .joker-page-wrapper > .innerFrame {
            height: 100%;
            min-height: 0;
            flex: 1 1 auto;
            align-self: stretch;
          }

          .joker-game-shell .joker-page-wrapper > * {
            max-height: 100%;
          }

          .joker-game-shell .joker-game-inner,
          .joker-game-shell .inner {
            height: 100%;
            min-height: 0;
          }
        }

        .joker-game-shell .joker-navigation-mobile-content .joker-page-wrapper::after {
          content: "";
          display: block;
          flex: 0 0 var(--game-shell-page-padding);
          width: 100%;
        }

      `}
    </style>
  );
}
