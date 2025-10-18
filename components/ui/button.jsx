import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  variant: {
    default: "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 backdrop-blur-sm",
    destructive: "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40",
    outline: "border-2 border-purple-400/70 bg-white/60 backdrop-blur-md shadow-lg hover:bg-white/80 hover:border-purple-500/90 text-purple-700",
    secondary: "bg-gradient-to-r from-cyan-400 to-blue-400 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40",
    ghost: "hover:bg-purple-100/60 hover:text-purple-700 backdrop-blur-sm",
    link: "text-purple-600 underline-offset-4 hover:underline hover:text-purple-700",
    gradient: "bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 text-white shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/50 backdrop-blur-sm",
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-xl px-3 text-xs",
    lg: "h-11 rounded-xl px-8",
    xl: "h-14 rounded-2xl px-10 text-lg font-semibold",
    icon: "h-10 w-10 rounded-xl",
  },
};

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
