import { useMediaQuery } from "@astryxdesign/core/hooks";

/** A phone, or a window as narrow as one: what stood side by side goes one above the other. */
export const useNarrow = (): boolean => useMediaQuery("(max-width: 768px)");
