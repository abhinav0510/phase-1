"use client";

import { createContext, useContext } from "react";

/** UI signals shared between the homepage shell and its client sections. */
export type HomeUi = {
  /** Called by the hero as the runway scrolls; hides the wordmark past the hero. */
  setPastHero: (past: boolean) => void;
  closeMenu: () => void;
};

export const HomeUiContext = createContext<HomeUi>({
  setPastHero: () => {},
  closeMenu: () => {},
});

export function useHomeUi() {
  return useContext(HomeUiContext);
}
