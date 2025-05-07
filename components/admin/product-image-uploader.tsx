"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import { CloudinaryUploader } from "@/components/cloudinary-uploader"
import { Input } from "@/components/ui/input"

export interface ProductImageItem {
  url: string
  alt: string
}

interface ProductImageUploadProps {
  images: ProductImageItem[]
  onChange: (images: ProductImageItem[]) => void
}

export function ProductImageUpload({ images, onChange }: ProductImageUploadProps) {
  const handleImageChange = (index: number, field: keyof ProductImageItem, value: string) => {
    const newImages = [...images]
    newImages[index] = {
      ...newImages[index],
      [field]: value,
    }
    onChange(newImages)
  }

  const handleFileUploaded = (index: number, url: string) => {
    const newImages = [...images]
    newImages[index] = {
      ...newImages[index],
      url,
    }
    onChange(newImages)
  }

  const addImage = () => {
    onChange([...images, { url: "", alt: "" }])
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onChange(newImages.length ? newImages : [{ url: "", alt: "" }])
  }

  return (
    <div className="space-y-6">
      {images.map((image, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="mb-4 flex justify-between">
            <h4 className="text-sm font-medium">Imagen {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => removeImage(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <CloudinaryUploader
                folder="products"
                onImageUploaded={(url) => handleFileUploaded(index, url)}
                currentImageUrl={image.url}
                maxSizeKB={1024}
                buttonText="Subir imagen"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`image-alt-${index}`}>Texto Alternativo</Label>
              <Input
                id={`image-alt-${index}`}
                value={image.alt || ""}
                onChange={(e) => handleImageChange(index, "alt", e.target.value)}
                placeholder="Descripción de la imagen"
              />

              {image.url && (
                <div className="mt-2 text-xs text-gray-500">
                  URL: <span className="font-mono break-all">{image.url}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addImage} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Añadir Otra Imagen
      </Button>
    </div>
  )
}
