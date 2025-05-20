import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "relative transition-all duration-200 ease-in-out",
        "data-[state=active]:text-primary-foreground data-[state=active]:font-semibold",
        "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary data-[state=active]:after:rounded-full data-[state=active]:after:transform data-[state=active]:after:transition-all data-[state=active]:after:duration-200",
        "data-[value=overview]:data-[state=active]:text-blue-600 dark:data-[value=overview]:data-[state=active]:text-blue-400",
        "data-[value=stocks]:data-[state=active]:text-emerald-600 dark:data-[value=stocks]:data-[state=active]:text-emerald-400",
        "data-[value=realestate]:data-[state=active]:text-purple-600 dark:data-[value=realestate]:data-[state=active]:text-purple-400",
        "data-[value=insights]:data-[state=active]:text-amber-600 dark:data-[value=insights]:data-[state=active]:text-amber-400",
        "data-[value=overview]:data-[state=active]:after:bg-blue-500",
        "data-[value=stocks]:data-[state=active]:after:bg-emerald-500",
        "data-[value=realestate]:data-[state=active]:after:bg-purple-500",
        "data-[value=insights]:data-[state=active]:after:bg-amber-500",
        "hover:bg-background/60 dark:hover:bg-background/10",
        className
      )}
      {...props}
    />
  )
}

// Animation variants for tab content
const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3, 
      ease: "easeOut",
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  // We'll simplify the motion component approach to avoid conflicts with AnimatePresence
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
