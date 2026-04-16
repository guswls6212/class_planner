import { ReactNode } from "react";

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[--color-bg-base]">
      {children}
    </div>
  );
}
