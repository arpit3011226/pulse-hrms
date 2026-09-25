import * as React from "react"
import { XIcon, ArrowLeftIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * How a dialog is presented.
 *
 * "dialog" is the small centred box, right for a single decision — approve
 * this, confirm that, pick one thing.
 *
 * "page" fills the screen and reads as a page of its own: a bar across the top
 * carrying the title and a back arrow, the content in a comfortable column down
 * the middle, and the buttons on a bar along the bottom. Anything where someone
 * is entering real information or reading a full record uses this, so a request
 * for a new asset or a look at a ticket gets the same room the employee record
 * gets, instead of a cramped box.
 *
 * DialogContent sets the mode; DialogHeader, DialogFooter and DialogTitle read
 * it from here so a screen changes over by passing one prop.
 */
type DialogSize = "dialog" | "page"

const DialogSizeContext = React.createContext<DialogSize>("dialog")

/**
 * True for children rendered inside the scrolling body of a page-sized dialog.
 *
 * Most screens put their buttons inside the <form> so that Enter submits, which
 * leaves DialogFooter nested rather than a direct child. It cannot become the
 * bar across the bottom from there, so it renders as a plain divider and a row
 * of buttons at the end of the form — which is how a page form normally ends.
 */
const DialogInPageBodyContext = React.createContext(false)

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

/** True when this element is one of our own header or footer bars. */
function isSlot(child: React.ReactNode, slot: typeof DialogHeader | typeof DialogFooter) {
  return React.isValidElement(child) && child.type === slot
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = "dialog",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  size?: DialogSize
}) {
  if (size === "page") {
    // The header and footer become the bars top and bottom; everything else is
    // the body and scrolls between them. Pulling them out by type means a
    // screen keeps the markup it already had and only passes size="page".
    const items = React.Children.toArray(children)
    const header = items.find((c) => isSlot(c, DialogHeader))
    const footer = items.find((c) => isSlot(c, DialogFooter))
    const body = items.filter((c) => c !== header && c !== footer)

    return (
      <DialogSizeContext.Provider value="page">
        <DialogPortal data-slot="dialog-portal">
          <DialogOverlay className="bg-black/20" />
          <DialogPrimitive.Content
            data-slot="dialog-content"
            data-size="page"
            className={cn(
              "fixed inset-0 z-50 flex w-full max-w-none flex-col border-0 bg-background p-0 shadow-none outline-none duration-200",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
              className
            )}
            {...props}
          >
            {header}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
                <DialogInPageBodyContext.Provider value={true}>
                  {body}
                </DialogInPageBodyContext.Provider>
              </div>
            </div>
            {footer}
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogSizeContext.Provider>
    )
  }

  return (
    <DialogSizeContext.Provider value="dialog">
      <DialogPortal data-slot="dialog-portal">
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogSizeContext.Provider>
  )
}

function DialogHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  const size = React.useContext(DialogSizeContext)

  if (size === "page") {
    return (
      <div
        data-slot="dialog-header"
        className={cn("shrink-0 border-b bg-background", className)}
        {...props}
      >
        <div className="mx-auto flex w-full max-w-4xl items-start gap-3 px-4 py-4 sm:px-6">
          {/* A back arrow rather than a cross: this reads as a page, so leaving
              it should feel like going back rather than dismissing a box. */}
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="-ml-2 mt-0.5 shrink-0">
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </DialogPrimitive.Close>
          <div className="flex flex-col gap-1 text-left">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const size = React.useContext(DialogSizeContext)
  const inPageBody = React.useContext(DialogInPageBodyContext)

  const closeButton = showCloseButton && (
    <DialogPrimitive.Close asChild>
      <Button variant="outline">Close</Button>
    </DialogPrimitive.Close>
  )

  if (size === "page" && inPageBody) {
    return (
      <div
        data-slot="dialog-footer"
        className={cn(
          "flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end",
          className
        )}
        {...props}
      >
        {children}
        {closeButton}
      </div>
    )
  }

  if (size === "page") {
    return (
      <div
        data-slot="dialog-footer"
        className={cn("shrink-0 border-t bg-background", className)}
        {...props}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col-reverse gap-2 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          {children}
          {closeButton}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {closeButton}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const size = React.useContext(DialogSizeContext)
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        size === "page" ? "text-xl leading-tight font-semibold" : "text-lg leading-none font-semibold",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
