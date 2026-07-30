import * as React from "react";
import { cn } from "@/lib/utils";

/** A glassmorphism surface used across marketing, auth and result pages. */
export const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("glass rounded-2xl p-6 transition-shadow", className)}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";
