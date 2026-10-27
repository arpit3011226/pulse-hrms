import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Tabs, TabsList, TabsTrigger } from './tabs'

/**
 * Tab order is not decoration.
 *
 * TabsList used to sort every set of tabs alphabetically. Sixteen of the
 * twenty tab strips in this app came out in an order nobody had chosen: the
 * hiring funnel began at Analytics, the new-employee form opened on
 * Compliance, and every "mine, then my team, then everyone" became "All,
 * then mine, then Team".
 *
 * These tests exist so that cannot come back quietly.
 */

function order(markup: string): string[] {
  return [...markup.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((m) => m[1].trim())
}

function render(sorted?: boolean) {
  return renderToStaticMarkup(
    <Tabs value="req">
      <TabsList sorted={sorted}>
        <TabsTrigger value="req">Requisitions</TabsTrigger>
        <TabsTrigger value="cand">Candidates</TabsTrigger>
        <TabsTrigger value="int">Interviews</TabsTrigger>
        <TabsTrigger value="off">Offers</TabsTrigger>
        <TabsTrigger value="an">Analytics</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

describe('TabsList ordering', () => {
  it('keeps the order the screen wrote, by default', () => {
    // The hiring funnel. Requisitions come before candidates in life, and
    // should on screen.
    expect(order(render())).toEqual([
      'Requisitions', 'Candidates', 'Interviews', 'Offers', 'Analytics',
    ])
  })

  it('does not begin the hiring funnel at Analytics', () => {
    expect(order(render())[0]).toBe('Requisitions')
  })

  it('still sorts when a screen asks for it', () => {
    expect(order(render(true))).toEqual([
      'Analytics', 'Candidates', 'Interviews', 'Offers', 'Requisitions',
    ])
  })
})
