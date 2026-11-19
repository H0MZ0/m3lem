"use client";
import { createContext, useContext, useState } from "react";
import type { SearchDraft } from "./draft";
type Entry = { path: string; draft: SearchDraft } | null;
const Context = createContext<{ entry: Entry; publish: (e: Entry) => void }>({
  entry: null,
  publish: () => {},
});
export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [entry, publish] = useState<Entry>(null);
  return (
    <Context.Provider value={{ entry, publish }}>{children}</Context.Provider>
  );
}
export const useSearchDraft = () => useContext(Context);
