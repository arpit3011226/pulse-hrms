import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)


/**
 * The visible text of a trigger, digging through icons and nested spans so a tab
 * labelled with an icon plus a word still sorts on the word.
 */
function tabLabel(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(tabLabel).join("")
  if (React.isValidElement(node)) {
    return tabLabel((node.props as { children?: React.ReactNode }).children)
  }
  return ""
}

function TabsList({
  className,
  variant = "default",
  sorted = false,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants> & {
    /**
     * Sort the tabs alphabetically instead of leaving them as written.
     *
     * Off by default, and that default was the other way round until we
     * looked at what it did. See the note below.
     */
    sorted?: boolean
  }) {
  /**
   * Tabs appear in the order the screen writes them.
   *
   * This used to sort every set of tabs in the app alphabetically, on the
   * reasoning that nobody should have to hunt for one. It reads well until
   * you look at what it produced: of twenty sets of tabs, sixteen came out
   * in an order nobody had chosen.
   *
   *   Recruitment  Requisitions → Candidates → Applications → Interviews
   *                → Offers, which is the hiring funnel, became
   *                Analytics → Applications → Background Checks → …
   *
   *   New employee Personal Info → Employment → Compliance, a form somebody
   *                fills top to bottom, opened on Compliance.
   *
   *   Payroll      eleven tabs beginning at Adjustments.
   *
   *   Everywhere   "mine, then my team, then everyone" — the shape most of
   *                this app is built on — came out as "All, then mine,
   *                then Team".
   *
   * Alphabetical helps you find a tab in a long flat list of unrelated
   * things. It destroys a sequence, and almost every tab strip here is a
   * sequence: a workflow, or a widening of scope. The person writing the
   * screen already knew the right order and wrote it down; sorting threw
   * that away.
   *
   * So: as written, by default. `sorted` is still there for a genuinely
   * flat catalogue where alphabetical would help.
   *
   * Which tab opens first is unaffected either way — that is chosen by
   * value, not position.
   */
  const ordered = React.useMemo(() => {
    const items = React.Children.toArray(children)
    if (!sorted) return items
    return [...items].sort((a, b) =>
      tabLabel(a).trim().localeCompare(tabLabel(b).trim(), "en")
    )
  }, [children, sorted])

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {ordered}
    </TabsPrimitive.List>
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
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
