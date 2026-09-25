import { useState } from 'react'
import { Heart, Lightbulb, MessageSquare, PartyPopper, Send, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  useAddRecognitionComment,
  useDeleteRecognitionComment,
  useToggleRecognitionReaction,
} from '../hooks/use-workplace'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * One recognition, with the part that makes it worth reading — other people
 * joining in.
 *
 * A recognition used to be written once and then sit there. Nobody could agree
 * with it, add what they had seen, or even say well done, which is most of what
 * makes recognition work: the pile-on, not the post.
 */

/** The reactions offered. Words, not emoji characters, so the database stays readable. */
const REACTIONS = [
  { key: 'clap', label: 'Well done', icon: PartyPopper },
  { key: 'heart', label: 'Love this', icon: Heart },
  { key: 'celebrate', label: 'Celebrate', icon: PartyPopper },
  { key: 'bulb', label: 'Good thinking', icon: Lightbulb },
] as const

// Two is enough on a card. More turns a feed into a toolbar.
const SHOWN_REACTIONS = REACTIONS.filter((r) => r.key === 'clap' || r.key === 'heart')

interface Reaction {
  id: string
  emoji: string
  employee_id: string
}

interface Comment {
  id: string
  comment: string
  created_at: string
  employee_id: string
  author?: { id: string; first_name: string; last_name: string } | null
}

interface RecognitionCardProps {
  recognition: Record<string, unknown>
  /** The signed-in person's employee record, if they have one. */
  myEmployeeId: string | undefined
  canModerate: boolean
}

export function RecognitionCard({
  recognition: r,
  myEmployeeId,
  canModerate,
}: RecognitionCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [draft, setDraft] = useState('')

  const toggleReaction = useToggleRecognitionReaction()
  const addComment = useAddRecognitionComment()
  const deleteComment = useDeleteRecognitionComment()

  const id = r.id as string
  const giver = r.giver as Record<string, unknown> | null
  const receiver = r.receiver as Record<string, unknown> | null
  const value = r.value as Record<string, unknown> | null
  const reactions = (r.reactions ?? []) as Reaction[]
  const comments = ((r.comments ?? []) as Comment[])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))

  function myReaction(emoji: string): Reaction | undefined {
    return reactions.find((x) => x.emoji === emoji && x.employee_id === myEmployeeId)
  }

  async function react(emoji: string) {
    if (!myEmployeeId) return
    const mine = myReaction(emoji)
    try {
      await toggleReaction.mutateAsync({
        recognition_id: id,
        employee_id: myEmployeeId,
        emoji,
        existingId: mine?.id ?? null,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that')
    }
  }

  async function submitComment() {
    const text = draft.trim()
    if (!text || !myEmployeeId) return
    try {
      await addComment.mutateAsync({
        recognition_id: id,
        employee_id: myEmployeeId,
        comment: text,
      })
      setDraft('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the comment')
    }
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-50 p-2">
            <Heart className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-medium">
                {giver ? `${giver.first_name} ${giver.last_name}` : 'Someone'}
              </span>
              {' recognised '}
              <span className="font-medium">
                {receiver ? `${receiver.first_name} ${receiver.last_name}` : 'someone'}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{r.message as string}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {value && (
                <Badge variant="secondary" className="text-xs">
                  {value.name as string}
                </Badge>
              )}
              {!r.is_public && <Badge variant="outline" className="text-xs">Private</Badge>}
              <span className="text-xs text-muted-foreground">
                {formatDate(r.created_at as string)}
              </span>
            </div>

            {/* Join in */}
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {SHOWN_REACTIONS.map(({ key, label, icon: Icon }) => {
                const count = reactions.filter((x) => x.emoji === key).length
                const mine = !!myReaction(key)
                return (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={cn('h-8 px-2 text-xs', mine && 'bg-accent text-accent-foreground')}
                    disabled={!myEmployeeId || toggleReaction.isPending}
                    onClick={() => react(key)}
                    title={label}
                  >
                    <Icon
                      className={cn('mr-1.5 h-3.5 w-3.5', mine && 'fill-current')}
                    />
                    {label}
                    {count > 0 && <span className="ml-1.5 font-medium">{count}</span>}
                  </Button>
                )
              })}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setShowComments((v) => !v)}
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Comment
                {comments.length > 0 && (
                  <span className="ml-1.5 font-medium">{comments.length}</span>
                )}
              </Button>
            </div>

            {/* Comments stay folded away until asked for, so the feed still
                reads as a feed rather than a thread. */}
            {showComments && (
              <div className="mt-3 space-y-3">
                <Separator />

                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No comments yet. Add what you saw.
                  </p>
                ) : (
                  comments.map((c) => {
                    const author = c.author
                    const canDelete = canModerate || c.employee_id === myEmployeeId
                    return (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {author
                              ? getInitials(author.first_name, author.last_name)
                              : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs">
                            <span className="font-medium">
                              {author
                                ? `${author.first_name} ${author.last_name}`
                                : 'Someone'}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              {formatDate(c.created_at, 'relative')}
                            </span>
                          </p>
                          <p className="whitespace-pre-wrap text-sm">{c.comment}</p>
                        </div>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground"
                            onClick={() => deleteComment.mutate(c.id)}
                            title="Delete this comment"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Delete this comment</span>
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}

                {myEmployeeId && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          submitComment()
                        }
                      }}
                      placeholder="Add a comment…"
                      maxLength={1000}
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      className="h-9"
                      disabled={!draft.trim() || addComment.isPending}
                      onClick={submitComment}
                    >
                      {addComment.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span className="sr-only">Post the comment</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
