"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface Control {
  controlling: boolean;
  setControlling: (on: boolean) => void;
}

const ControlContext = createContext<Control | null>(null);

/** Estado «tomar control» compartido entre la cabecera (el boton) y el cuerpo (el video). */
export function ControlProvider({ children }: { children: ReactNode }) {
  const [controlling, setControlling] = useState(false);
  return (
    <ControlContext.Provider value={{ controlling, setControlling }}>{children}</ControlContext.Provider>
  );
}

export function useControl(): Control {
  const value = useContext(ControlContext);
  if (!value) throw new Error("useControl fuera de ControlProvider");
  return value;
}
