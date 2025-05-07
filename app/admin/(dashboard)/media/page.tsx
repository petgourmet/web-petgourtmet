"use client"

import { useState, useEffect } from "react"
import { FileUpload } from "@/components/file-upload"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { productImagesStorage, blogImagesStorage } from "@/lib/supabase/storage-service"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import Image from "next/image"
import { toast } from "@/components/ui/use-toast"

export default function MediaPage() {
  const [activeTab, setActiveTab] = useState("products")
  const [productImages, setProductImages] = useState<{ name: string; url: string }[]>([])
  const [blogImages, setBlogImages] = useState<{ name: string; url: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadImages()
  }, [activeTab])

  const loadImages = async () => {
    setLoading(true)
    try {
      if (activeTab === "products") {
        const images = await productImagesStorage.listFiles()
        setProductImages(images)
      } else if (activeTab === "blogs") {
        const images = await blogImagesStorage.listFiles()
        setBlogImages(images)
      }
    } catch (error: any) {
      console.error("Error al cargar imágenes:", error)
      toast({
        title: "Error",
        description: `No se pudieron cargar las imágenes: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = (url: string) => {
    loadImages()
  }

  const handleDeleteImage = async (path: string, isProduct: boolean) => {
    try {
      const storage = isProduct ? productImagesStorage : blogImagesStorage
      const fileName = path.split("/").pop() || ""
      const folderPath = isProduct ? "products" : "blogs"
      await storage.deleteFile(`${folderPath}/${fileName}`)

      toast({
        title: "Imagen eliminada",
        description: "La imagen se ha eliminado correctamente.",
      })

      loadImages()
    } catch (error: any) {
      console.error("Error al eliminar imagen:", error)
      toast({
        title: "Error",
        description: `No se pudo eliminar la imagen: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestión de Archivos</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Imágenes de Productos</TabsTrigger>
          <TabsTrigger value="blogs">Imágenes de Blog</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subir Nueva Imagen de Producto</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                bucketName="images"
                folderPath="products"
                onUploadComplete={handleUploadComplete}
                accept="image/*"
                maxSizeMB={2}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imágenes de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : productImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {productImages.map((image) => (
                    <div key={image.url} className="group relative overflow-hidden rounded-md border">
                      <div className="relative aspect-square">
                        <Image src={image.url || "/placeholder.svg"} alt={image.name} fill className="object-cover" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(image.url, true)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="truncate bg-white p-2 text-xs">{image.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground">No hay imágenes de productos.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blogs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subir Nueva Imagen de Blog</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                bucketName="images"
                folderPath="blogs"
                onUploadComplete={handleUploadComplete}
                accept="image/*"
                maxSizeMB={2}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imágenes de Blog</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : blogImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {blogImages.map((image) => (
                    <div key={image.url} className="group relative overflow-hidden rounded-md border">
                      <div className="relative aspect-square">
                        <Image src={image.url || "/placeholder.svg"} alt={image.name} fill className="object-cover" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(image.url, false)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="truncate bg-white p-2 text-xs">{image.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground">No hay imágenes de blog.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
