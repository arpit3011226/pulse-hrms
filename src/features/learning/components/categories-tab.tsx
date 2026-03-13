import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CategoryFormDialog } from './category-form-dialog'
import { useCourseCategories, useDeleteCategory } from '../hooks/use-learning'
import type { CourseCategory } from '@/types/database.types'
import { toast } from 'sonner'

export function CategoriesTab() {
  const { data: categories, isLoading } = useCourseCategories()
  const deleteCategory = useDeleteCategory()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CourseCategory | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns: ColumnDef<CourseCategory>[] = [
    {
      accessorKey: 'category_name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.category_name}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.description || '—'}</span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true) }}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={categories ?? []}
        isLoading={isLoading}
        searchKey="category_name"
        searchPlaceholder="Search categories..."
        toolbarActions={
          <Button onClick={() => { setEditing(undefined); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Category"
        description="Are you sure? Courses in this category will become uncategorized."
        onConfirm={async () => {
          try {
            await deleteCategory.mutateAsync(deleteId!)
            toast.success('Category deleted')
            setDeleteId(null)
          } catch (err: any) {
            toast.error(err.message || 'Failed to delete')
          }
        }}
        isLoading={deleteCategory.isPending}
      />
    </>
  )
}
