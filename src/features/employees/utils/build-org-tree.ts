import type { Employee } from '@/types/database.types'

/** Lightweight employee shape for the org chart (matches what the list API returns) */
export type OrgChartEmployee = Employee & {
  department?: { id: string; name: string } | null
  designation?: { id: string; title: string } | null
}

export interface OrgTreeNode {
  employee: OrgChartEmployee
  children: OrgTreeNode[]
}

/**
 * Build a hierarchical tree from a flat list of employees.
 * Uses reporting_manager_id to link parent → children.
 * Employees with no manager (or manager not in list) become root nodes.
 */
export function buildOrgTree(employees: OrgChartEmployee[]): OrgTreeNode[] {
  const nodeMap = new Map<string, OrgTreeNode>()

  // Pass 1: create a node for every employee
  for (const emp of employees) {
    nodeMap.set(emp.id, { employee: emp, children: [] })
  }

  const roots: OrgTreeNode[] = []

  // Pass 2: link children to parents
  for (const emp of employees) {
    const node = nodeMap.get(emp.id)!
    if (emp.reporting_manager_id && nodeMap.has(emp.reporting_manager_id)) {
      nodeMap.get(emp.reporting_manager_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Sort children alphabetically at every level
  function sortChildren(node: OrgTreeNode) {
    node.children.sort((a, b) =>
      `${a.employee.first_name} ${a.employee.last_name}`.localeCompare(
        `${b.employee.first_name} ${b.employee.last_name}`
      )
    )
    node.children.forEach(sortChildren)
  }

  roots.sort((a, b) =>
    `${a.employee.first_name} ${a.employee.last_name}`.localeCompare(
      `${b.employee.first_name} ${b.employee.last_name}`
    )
  )
  roots.forEach(sortChildren)

  return roots
}

/**
 * Find all ancestor IDs for a given employee ID in the tree.
 * Used to expand the path when searching.
 */
export function getAncestorIds(
  employees: OrgChartEmployee[],
  targetId: string
): string[] {
  const parentMap = new Map<string, string>()
  for (const emp of employees) {
    if (emp.reporting_manager_id) {
      parentMap.set(emp.id, emp.reporting_manager_id)
    }
  }

  const ancestors: string[] = []
  let current = parentMap.get(targetId)
  const visited = new Set<string>()
  while (current && !visited.has(current)) {
    ancestors.push(current)
    visited.add(current)
    current = parentMap.get(current)
  }
  return ancestors
}

/**
 * Count total descendants of a node (recursive).
 */
export function countDescendants(node: OrgTreeNode): number {
  let count = node.children.length
  for (const child of node.children) {
    count += countDescendants(child)
  }
  return count
}
