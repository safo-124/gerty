import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "border-transparent bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30 backdrop-blur-sm",
    secondary: "border-transparent bg-cyan-100/90 text-cyan-900 backdrop-blur-sm hover:bg-cyan-200/90",
    destructive: "border-transparent bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30",
    outline: "border-2 border-purple-400/70 bg-white/70 text-purple-700 backdrop-blur-md hover:bg-white/90",
    success: "border-transparent bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg shadow-green-500/30",
    warning: "border-transparent bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
