import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ZoomIn, ZoomOut, Maximize2, Users } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { buildOrgTree, getAncestorIds, countDescendants } from '../utils/build-org-tree'
import { OrgChartNode } from './org-chart-node'
import type { OrgTreeNode, OrgChartEmployee } from '../utils/build-org-tree'
import './org-chart.css'

interface OrgChartViewProps {
  employees: OrgChartEmployee[]
}

export function OrgChartView({ employees }: OrgChartViewProps) {
  const { profile } = useAuth()
  const permissions = usePermissions()

  const [searchQuery, setSearchQuery] = useState('')
  const [zoomLevel, setZoomLevel] = useState(0.85)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Build tree
  const tree = useMemo(() => buildOrgTree(employees), [employees])

  // Initialize expanded nodes — expand all by default for small orgs, top 2 levels for large
  useEffect(() => {
    const allIds = new Set<string>()
    function collectIds(nodes: OrgTreeNode[], depth: number) {
      for (const node of nodes) {
        if (employees.length <= 50 || depth < 2) {
          allIds.add(node.employee.id)
        }
        collectIds(node.children, depth + 1)
      }
    }
    collectIds(tree, 0)
    setExpandedNodes(allIds)
  }, [tree, employees.length])

  // Find current user's employee record
  const currentEmployeeId = useMemo(() => {
    const emp = employees.find((e) => e.profile_id === profile?.id)
    return emp?.id
  }, [employees, profile?.id])

  // Permission check for contact details
  const canSeeContactInfo = useCallback(
    (employeeId: string) => {
      if (
        permissions.isAdmin ||
        permissions.isHR ||
        permissions.isManager ||
        permissions.isLeadership ||
        permissions.isPayrollAdmin
      ) {
        return true
      }
      return employeeId === currentEmployeeId
    },
    [permissions, currentEmployeeId]
  )

  // Toggle expand/collapse
  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setHighlightedId(null)
      return
    }

    const q = searchQuery.toLowerCase()
    const match = employees.find(
      (e) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
    )

    if (match) {
      setHighlightedId(match.id)
      // Expand ancestors
      const ancestorIds = getAncestorIds(employees, match.id)
      setExpandedNodes((prev) => {
        const next = new Set(prev)
        ancestorIds.forEach((id) => next.add(id))
        next.add(match.id)
        return next
      })
      // Scroll into view
      requestAnimationFrame(() => {
        const el = nodeRefs.current.get(match.id)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      })
    } else {
      setHighlightedId(null)
    }
  }, [searchQuery, employees])

  // Zoom controls
  const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.1, 1.5))
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.1, 0.3))
  const zoomFit = () => setZoomLevel(0.85)

  // Expand all / Collapse all
  const expandAll = () => {
    const allIds = new Set<string>()
    function collect(nodes: OrgTreeNode[]) {
      for (const node of nodes) {
        allIds.add(node.employee.id)
        collect(node.children)
      }
    }
    collect(tree)
    setExpandedNodes(allIds)
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-12 w-12 mb-3" />
        <p className="text-sm font-medium">No employees found</p>
        <p className="text-xs mt-1">Add employees to see the org chart.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-1 border rounded-md">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomFit} title="Fit to screen">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="text-xs" onClick={expandAll}>
          Expand All
        </Button>

        <span className="ml-auto text-xs text-muted-foreground">
          {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tree container */}
      <div
        ref={containerRef}
        className="overflow-auto border rounded-lg bg-muted/20"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setZoomLevel((z) => {
              const delta = e.deltaY > 0 ? -0.05 : 0.05
              return Math.min(1.5, Math.max(0.3, z + delta))
            })
          }
        }}
      >
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
          className="inline-flex flex-col items-center p-8 min-w-full"
        >
          {tree.map((root) => (
            <OrgChartSubtree
              key={root.employee.id}
              node={root}
              expandedNodes={expandedNodes}
              highlightedId={highlightedId}
              canSeeContactInfo={canSeeContactInfo}
              toggleNode={toggleNode}
              nodeRefs={nodeRefs}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Recursive subtree component ──────────────────────────────────────

interface SubtreeProps {
  node: OrgTreeNode
  expandedNodes: Set<string>
  highlightedId: string | null
  canSeeContactInfo: (id: string) => boolean
  toggleNode: (id: string) => void
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
}

function OrgChartSubtree({
  node,
  expandedNodes,
  highlightedId,
  canSeeContactInfo,
  toggleNode,
  nodeRefs,
}: SubtreeProps) {
  const isExpanded = expandedNodes.has(node.employee.id)
  const hasChildren = node.children.length > 0
  const descendants = countDescendants(node)

  return (
    <div className="flex flex-col items-center">
      <div
        ref={(el) => {
          if (el) nodeRefs.current.set(node.employee.id, el)
        }}
      >
        <OrgChartNode
          employee={node.employee}
          childCount={descendants}
          isExpanded={isExpanded}
          isHighlighted={highlightedId === node.employee.id}
          showContactInfo={canSeeContactInfo(node.employee.id)}
          onToggle={() => toggleNode(node.employee.id)}
        />
      </div>

      {isExpanded && hasChildren && (
        <div className="org-tree-children">
          {node.children.map((child) => (
            <div key={child.employee.id} className="org-tree-branch">
              <OrgChartSubtree
                node={child}
                expandedNodes={expandedNodes}
                highlightedId={highlightedId}
                canSeeContactInfo={canSeeContactInfo}
                toggleNode={toggleNode}
                nodeRefs={nodeRefs}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
