"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Filter,
  ImageIcon,
  MoreVertical,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  UtensilsCrossed,
  Wine,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/constants"
import type { Category, MenuItem } from "@/lib/types"
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  toggleMenuItemAvailabilityAction,
} from "@/app/actions/admin"

// Compress image client-side before upload (max 800px, 75% JPEG quality)
async function compressImage(file: File, maxDim = 800, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Compression failed"))
        },
        "image/jpeg",
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    img.src = url
  })
}

type ItemWithCategory = MenuItem & { category: Category | null }

export function MenuManager({
  categories,
  items,
}: {
  categories: Category[]
  items: ItemWithCategory[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<"items" | "categories">("items")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all")

  // dialogs
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: ItemWithCategory | null }>({ open: false, item: null })
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null })
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (categoryFilter !== "all" && i.category_id !== categoryFilter) return false
      if (availabilityFilter === "available" && !i.is_available) return false
      if (availabilityFilter === "unavailable" && i.is_available) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q)
      )
    })
  }, [items, search, categoryFilter, availabilityFilter])

  const itemsByCategory = useMemo(() => {
    const map = new Map<string | null, ItemWithCategory[]>()
    for (const item of items) {
      const key = item.category_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [items])

  const stats = useMemo(() => {
    const total = items.length
    const available = items.filter((i) => i.is_available).length
    const alcoholic = items.filter((i) => i.is_alcoholic).length
    return { total, available, alcoholic, categories: categories.length }
  }, [items, categories])

  const onToggleAvailability = (item: ItemWithCategory) => {
    startTransition(async () => {
      await toggleMenuItemAvailabilityAction(item.id, !item.is_available)
      router.refresh()
    })
  }

  const onDeleteItem = () => {
    if (!deleteItemId) return
    startTransition(async () => {
      await deleteMenuItemAction(deleteItemId)
      setDeleteItemId(null)
      router.refresh()
    })
  }

  const onDeleteCategory = () => {
    if (!deleteCategoryId) return
    startTransition(async () => {
      await deleteCategoryAction(deleteCategoryId)
      setDeleteCategoryId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu Management"
        description={`${stats.total} items across ${stats.categories} categories • ${stats.available} available`}
        crumbs={[{ label: "Admin", href: "/admin" }, { label: "Menu" }]}
        actions={
          <>
            {tab === "items" && (
              <Button size="sm" onClick={() => setItemDialog({ open: true, item: null })}>
                <Plus className="mr-2 size-4" />
                New Item
              </Button>
            )}
            {tab === "categories" && (
              <Button size="sm" onClick={() => setCategoryDialog({ open: true, category: null })}>
                <Plus className="mr-2 size-4" />
                New Category
              </Button>
            )}
          </>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "items" | "categories")}>
        <TabsList>
          <TabsTrigger value="items">
            <UtensilsCrossed className="size-4" />
            Items ({items.length})
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="size-4" />
            Categories ({categories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search items by name or description..."
                  className="h-9 pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
                <SelectTrigger className="h-9 w-48">
                  <SelectValue>
                    {categoryFilter === "all"
                      ? "All categories"
                      : categories.find((c) => c.id === categoryFilter)?.name ?? "Category"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={availabilityFilter}
                onValueChange={(v) => setAvailabilityFilter(v as "all" | "available" | "unavailable")}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
              {(search || categoryFilter !== "all" || availabilityFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setCategoryFilter("all")
                    setAvailabilityFilter("all")
                  }}
                >
                  <Filter className="mr-1 size-3" />
                  Clear
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Items list */}
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <UtensilsCrossed className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm font-medium">No items found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search || categoryFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Start by adding your first menu item"}
                </p>
                {!search && categoryFilter === "all" && (
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => setItemDialog({ open: true, item: null })}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Item
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  pending={pending}
                  onEdit={() => setItemDialog({ open: true, item })}
                  onDelete={() => setDeleteItemId(item.id)}
                  onToggle={() => onToggleAvailability(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Tag className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm font-medium">No categories yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Organize your menu by creating categories</p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => setCategoryDialog({ open: true, category: null })}
                >
                  <Plus className="mr-2 size-4" />
                  Add Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {categories.map((cat) => {
                    const catItems = itemsByCategory.get(cat.id) ?? []
                    const available = catItems.filter((i) => i.is_available).length
                    return (
                      <li
                        key={cat.id}
                        className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                          {cat.sort_order}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{cat.name}</span>
                            {!cat.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {cat.description && (
                            <p className="truncate text-xs text-muted-foreground">{cat.description}</p>
                          )}
                        </div>
                        <div className="hidden text-right text-xs text-muted-foreground sm:block">
                          <div>{catItems.length} items</div>
                          <div className="text-emerald-600 dark:text-emerald-400">{available} available</div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button size="icon-sm" variant="ghost" />}
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Menu</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setCategoryDialog({ open: true, category: cat })}>
                              <Edit3 className="size-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteCategoryId(cat.id)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Item dialog */}
      <ItemFormDialog
        key={itemDialog.item?.id ?? "new"}
        open={itemDialog.open}
        item={itemDialog.item}
        categories={categories}
        onClose={() => setItemDialog({ open: false, item: null })}
        onSaved={() => {
          setItemDialog({ open: false, item: null })
          router.refresh()
        }}
      />

      {/* Category dialog */}
      <CategoryFormDialog
        key={categoryDialog.category?.id ?? "new"}
        open={categoryDialog.open}
        category={categoryDialog.category}
        onClose={() => setCategoryDialog({ open: false, category: null })}
        onSaved={() => {
          setCategoryDialog({ open: false, category: null })
          router.refresh()
        }}
      />

      {/* Delete confirmations */}
      <Dialog open={!!deleteItemId} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete menu item?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Items that have been used in past orders will be unlinked but historical data will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteItem} disabled={pending}>
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCategoryId} onOpenChange={(o) => !o && setDeleteCategoryId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              Categories with existing menu items cannot be deleted. Move or remove items first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onDeleteCategory} disabled={pending}>
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Item card
// ============================================================
function ItemCard({
  item,
  pending,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: ItemWithCategory
  pending: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <Card className="group overflow-hidden transition-all hover:border-foreground/20 hover:shadow-sm">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-muted to-muted/40">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="size-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          {item.is_alcoholic && (
            <Badge variant="secondary" className="bg-amber-500/90 text-white">
              <Wine className="size-3" />
            </Badge>
          )}
          {!item.is_available && (
            <Badge variant="secondary" className="bg-rose-500/90 text-white">
              Unavailable
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold">{item.name}</h3>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(Number(item.price))}
            </span>
          </div>
          {item.category && (
            <Badge variant="outline" className="text-xs">
              {item.category.name}
            </Badge>
          )}
          {item.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          )}
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Switch
                size="sm"
                checked={item.is_available}
                onCheckedChange={onToggle}
                disabled={pending}
              />
              <span>{item.is_available ? "Available" : "Off"}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button size="icon-xs" variant="ghost" />}
              >
                <MoreVertical className="size-3.5" />
                <span className="sr-only">Menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="size-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Item form dialog
// ============================================================
function ItemFormDialog({
  open,
  item,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean
  item: ItemWithCategory | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [compressedSize, setCompressedSize] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Controlled Select state for category
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none")

  // Reset state every time the dialog re-opens (for a different/new item)
  useEffect(() => {
    if (open) {
      setImageFile(null)
      setImagePreview(null)
      setRemoveImage(false)
      setCompressing(false)
      setCompressedSize(null)
      setError(null)
      setSelectedCategoryId(item?.category_id ?? "none")
    }
  }, [open, item?.id])

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const existingImage = item?.image_url ?? null
  const showExisting = existingImage && !imageFile && !removeImage
  const showPreview = !!imagePreview

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      setCompressedSize(null)
      return
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPEG, PNG, WebP, or GIF).")
      e.target.value = ""
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`Image too large (max 5MB). Yours is ${(file.size / 1024 / 1024).toFixed(1)}MB.`)
      e.target.value = ""
      return
    }
    setError(null)
    setRemoveImage(false)

    // Clean up old preview URL
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview)
    }

    // Compress image client-side
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      const compressedFile = new File([compressed], `menu-${Date.now()}.jpg`, { type: "image/jpeg" })
      setCompressedSize(compressedFile.size)
      setImageFile(compressedFile)
      setImagePreview(URL.createObjectURL(compressedFile))
    } catch {
      // Fallback to original if compression fails
      console.warn("Image compression failed, using original")
      setCompressedSize(null)
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
    setCompressing(false)
  }

  const clearNewFile = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
    setCompressedSize(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemoveImage = () => {
    clearNewFile()
    setRemoveImage(true)
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    // Strip the empty default File that browsers send for an unselected input
    const emptyFile = fd.get("image_file")
    if (emptyFile instanceof File && emptyFile.size === 0) {
      fd.delete("image_file")
    }
    // Carry the "remove" intent through a sentinel field the server respects
    if (removeImage && !imageFile) {
      fd.set("image_url", "")
    }
    startTransition(async () => {
      const result = item
        ? await updateMenuItemAction(item.id, fd)
        : await createMenuItemAction(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      clearNewFile()
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Menu Item" : "New Menu Item"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Update item details. Changes apply to new orders only."
              : "Add a new item to your menu. It will appear immediately for new orders."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={item?.name ?? ""} placeholder="e.g. Grilled Salmon" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={item?.description ?? ""}
                placeholder="Short description shown to customers"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price (₱) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={item?.price ?? ""}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_id">Category</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(v) => setSelectedCategoryId(v)}
                name="category_id"
              >
                <SelectTrigger id="category_id" className="w-full">
                  <SelectValue>
                    {selectedCategoryId === "none"
                      ? "— No category —"
                      : categories.find((c) => c.id === selectedCategoryId)?.name ?? "— No category —"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No category —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="category_id"
                value={item?.category_id ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prep_minutes">Prep time (min)</Label>
              <Input
                id="prep_minutes"
                name="prep_minutes"
                type="number"
                min="1"
                defaultValue={item?.prep_minutes ?? 15}
              />
            </div>

            {/* Image upload */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Image</Label>
              <input
                ref={fileInputRef}
                id="image_file"
                name="image_file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="sr-only"
              />
              {/* Hidden field the server reads when no new file is picked */}
              <input
                type="hidden"
                name="image_url"
                value={removeImage ? "" : (item?.image_url ?? "")}
              />

              <div className="flex items-start gap-3">
                <div className="relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-md border bg-gradient-to-br from-muted to-muted/40">
                  {showPreview || showExisting ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={showPreview ? imagePreview! : existingImage!}
                      alt="Menu item preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="size-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-3.5" />
                    {showPreview
                      ? "Replace image"
                      : showExisting
                      ? "Replace image"
                      : "Upload image"}
                  </Button>
                  {showPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearNewFile}
                    >
                      <X className="mr-2 size-3.5" />
                      Discard selection
                    </Button>
                  )}
                  {!showPreview && showExisting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Remove current image
                    </Button>
                  )}
                  {imageFile && (
                    <p className="break-all text-xs text-muted-foreground">
                      {compressing ? (
                        "Compressing..."
                      ) : compressedSize && compressedSize < imageFile.size ? (
                        <>Compressed: {(compressedSize / 1024).toFixed(0)} KB (saved {((1 - compressedSize / imageFile.size) * 100).toFixed(0)}%)</>
                      ) : (
                        <>Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)</>
                      )}
                    </p>
                  )}
                  {!imageFile && !showExisting && (
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, WebP, or GIF • Auto-compressed to ~75% JPEG • max 5MB
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-6 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_available"
                  name="is_available"
                  defaultChecked={item?.is_available ?? true}
                />
                <Label htmlFor="is_available" className="cursor-pointer">
                  Available for ordering
                </Label>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Switch
                  id="is_alcoholic"
                  name="is_alcoholic"
                  defaultChecked={item?.is_alcoholic ?? false}
                />
                <Label htmlFor="is_alcoholic" className="cursor-pointer">
                  Contains alcohol
                </Label>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending || compressing}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || compressing}>
              {pending ? "Saving..." : compressing ? "Compressing..." : item ? "Save Changes" : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Category form dialog
// ============================================================
function CategoryFormDialog({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean
  category: Category | null
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    if (category) fd.set("is_active", "true")
    startTransition(async () => {
      const result = category
        ? await updateCategoryAction(category.id, fd)
        : await createCategoryAction(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Update category details."
              : "Create a new menu category to organize your items."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name *</Label>
            <Input
              id="cat-name"
              name="name"
              required
              defaultValue={category?.name ?? ""}
              placeholder="e.g. Appetizers"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              name="description"
              rows={2}
              defaultValue={category?.description ?? ""}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-sort">Sort order</Label>
            <Input
              id="cat-sort"
              name="sort_order"
              type="number"
              defaultValue={category?.sort_order ?? 0}
            />
            <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : category ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Suppress unused icon warnings
void ChevronDown
void ChevronUp
