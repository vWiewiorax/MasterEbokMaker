"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, ImageIcon, Copy, Check, Calendar, Tag, Loader2, Send } from "lucide-react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { collection, addDoc, serverTimestamp, doc, deleteDoc, setDoc, where, getDocs, query } from "firebase/firestore"
import Image from "next/image"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "@radix-ui/react-alert-dialog"
import { AlertDialogFooter, AlertDialogHeader } from "@/components/ui/alert"
import { useSearchParams, useRouter } from "next/navigation"
import { useBlogs } from "@/app/lib/useBlogs"
import { db, storage } from "@/app/lib/friebase"

export default function BlogEditorPage() {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [category, setCategory] = useState("Relacje i związki")
  const [excerpt, setExcerpt] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [inlineImageLink, setInlineImageLink] = useState<string | null>(null)
  const [isUploadingMain, setIsUploadingMain] = useState(false)
  const [isUploadingInline, setIsUploadingInline] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false)
  const [code, setCode] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")
  const mainImageInputRef = useRef<HTMLInputElement>(null)
  const inlineImageInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const { products, isLoaded, listenToProducts } = useBlogs()

  useEffect(() => {
    if (editId && products.length > 0) {
      const blog = products.find(b => b.id === editId)
      if (blog) {
        setTitle(blog.title)
        setSlug(blog.slug)
        setCategory(blog.category)
        setExcerpt(blog.excerpt)
        setHtmlContent(blog.htmlContent)
        setMainImage(blog.mainImage)
      }
    }
  }, [editId, products])

  useEffect(() => {
    const unsubscribe = listenToProducts()
    return unsubscribe
  }, [listenToProducts])

  useEffect(() => {
    const generatedSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
    setSlug(generatedSlug)
  }, [title])

  const uploadToFirebase = async (file: File, folder: string): Promise<string> => {
    const timestamp = Date.now()
    const fileName = `${folder}/${timestamp}-${file.name}`
    const storageRef = ref(storage, fileName)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingMain(true)
    try {
      const url = await uploadToFirebase(file, "blog-main-images")
      setMainImage(url)
    } finally {
      setIsUploadingMain(false)
    }
  }

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingInline(true)
    try {
      const url = await uploadToFirebase(file, "blog-inline-images")
      setInlineImageLink(url)
    } finally {
      setIsUploadingInline(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedLink(text)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const copyImageTag = () => {
    if (!inlineImageLink) return
    const tag = `<img src="${inlineImageLink}" alt="" class="w-full rounded-xl my-6" />`
    copyToClipboard(tag)
  }

  const handleCodeCheck = () => {
    if (code === process.env.NEXT_PUBLIC_KEY) {
      setOpenConfirmDialog(false)
      publishToFirestore()
    }
  }

  const publishToFirestore = async () => {
    setIsPublishing(true)
    try {
      if (editId) {
        const q = query(collection(db, "blogs"), where("id", "==", editId))
        const querySnapshot = await getDocs(q)
        const docSnapshot = querySnapshot.docs[0]
        await setDoc(doc(db, "blogs", docSnapshot.id), {
          title, slug, category, excerpt: excerpt || title,
          mainImage, htmlContent,
          updatedAt: serverTimestamp(),
          published: true,
        }, { merge: true })
      } else {
        await addDoc(collection(db, "blogs"), {
          id: crypto.randomUUID(),
          title, slug, category, excerpt: excerpt || title,
          mainImage, htmlContent,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          published: true,
        })
      }
      setPublishSuccess(true)
      setTimeout(() => setPublishSuccess(false), 3000)
      if (!editId) {
        setTitle(""); setSlug(""); setCategory("Relacje i związki"); setExcerpt(""); setHtmlContent(""); setMainImage(null)
      }
      router.push("/")
    } finally {
      setIsPublishing(false)
    }
  }

  const deleteBlogByFieldId = async (fieldId: string) => {
    const q = query(collection(db, "blogs"), where("id", "==", fieldId))
    const querySnapshot = await getDocs(q)
    querySnapshot.forEach(async (docSnapshot) => {
      await deleteDoc(doc(db, "blogs", docSnapshot.id))
    })
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      {/* Confirm & Delete Dialogs */}
      <AlertDialog open={openConfirmDialog} onOpenChange={setOpenConfirmDialog}>
        {openConfirmDialog && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <AlertDialogContent className="w-[95%] max-w-md rounded-3xl border bg-white p-6 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-semibold text-center text-zinc-900">Potwierdź dodanie</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-center text-zinc-700">
                  Podaj kod weryfikacyjny aby kontynuować.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="mt-6">
                <input
                  type="text"
                  placeholder="Kod weryfikacyjny"
                  className="w-full rounded-xl border bg-zinc-100 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <AlertDialogFooter className="mt-6 flex justify-center">
                <AlertDialogAction
                  disabled={!code}
                  onClick={handleCodeCheck}
                  className="rounded-xl bg-red-600 px-6 py-2 text-black hover:bg-red-700 disabled:opacity-50"
                >
                  Potwierdź
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </div>
        )}
      </AlertDialog>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        {openDeleteDialog && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <AlertDialogContent className="w-[95%] max-w-md rounded-3xl border bg-white p-6 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-semibold text-center text-zinc-900">Potwierdź usunięcie</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 text-center text-zinc-700">
                  Operacja jest nieodwracalna.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 flex justify-center gap-4">
                <AlertDialogCancel onClick={() => setOpenDeleteDialog(false)} className="rounded-xl border border-zinc-300 px-6 py-2 hover:bg-zinc-100">
                  Anuluj
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    if (!deleteId) return
                    await deleteBlogByFieldId(deleteId)
                    setOpenDeleteDialog(false)
                    setDeleteId(null)
                  }}
                  className="rounded-xl bg-red-600 px-6 py-2 text-black hover:bg-red-700"
                >
                  Usuń
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </div>
        )}
      </AlertDialog>

      {/* Editor */}
      <div className="container mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-12">
          <p className="text-zinc-500 text-sm tracking-widest uppercase mb-4">Panel administracyjny</p>
          <h1 className="font-serif text-4xl md:text-5xl text-zinc-900">Edytor wpisów blogowych</h1>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Editor */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-8">
            {/* Main Image Upload */}
            <div className="space-y-4">
              <Label className="text-zinc-900 text-lg">Główny obrazek</Label>
              <div onClick={() => mainImageInputRef.current?.click()} className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center hover:border-zinc-400 transition-colors cursor-pointer bg-white/10">
                {isUploadingMain ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-zinc-500 animate-spin" />
                    <p className="text-zinc-500">Przesyłanie...</p>
                  </div>
                ) : mainImage ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <Image src={mainImage || "/placeholder.svg"} alt="Główny obrazek" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="w-12 h-12 text-zinc-500" />
                    <p className="text-zinc-500">Kliknij aby dodać główny obrazek</p>
                  </div>
                )}
                <input ref={mainImageInputRef} type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" />
              </div>
            </div>

            {/* Title, Slug, Category, Excerpt, HTML Content */}
            <div className="space-y-4">
              <Label className="text-zinc-900 text-lg">Tytuł wpisu *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Wprowadź tytuł..." className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 py-4" />
            </div>
            <div className="space-y-4">
              <Label className="text-zinc-900 text-lg">Slug (URL)</Label>
              <Input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug-wpisu" className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400" />
            </div>
            <div className="space-y-4">
              <Label className="text-zinc-900 text-lg">Kategoria</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400" />
            </div>
            <div className="space-y-4">
              <Label className="text-zinc-900 text-lg">Krótki opis (excerpt)</Label>
              <Textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 min-h-[80px]" />
            </div>
            <div className="space-y-4">
              <Label className="text-zinc-900 text-lg">Treść HTML *</Label>
              <Textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)} className="bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 min-h-[400px] font-mono text-sm" />
            </div>
          </motion.div>

          {/* Right Preview */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-black text-lg">Podgląd na żywo</Label>
              <span className="text-black/40 text-sm">Stylowany jak /blog/[slug]</span>
            </div>

            <div ref={previewRef} className="text-black border border-white/10 rounded-xl overflow-hidden">
              {/* Hero Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/5">
                {mainImage ? <img src={mainImage} alt={title || "Podgląd"} className="w-full h-full object-cover" /> : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-black/20 mx-auto mb-4" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t " />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="inline-flex items-center gap-2 text-black/60 text-sm"><Tag className="w-4 h-4" />{category}</span>
                    <span className="inline-flex items-center gap-2 text-black/60 text-sm"><Calendar className="w-4 h-4" />{new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <h1 className="font-serif text-2xl md:text-3xl text-black leading-tight">{title || "Tytuł wpisu pojawi się tutaj..."}</h1>
                </div>
              </div>

              {/* Live HTML Preview */}
              <div className="p-8">
                {htmlContent ? (
                  <article
                    className="prose prose-invert max-w-none [&_p]:text-black/80 [&_p]:leading-relaxed [&_h2]:font-serif [&_h2]:text-black [&_h3]:font-serif [&_h3]:text-black [&_img]:rounded-xl [&_img]:my-6 [&_a]:text-black [&_a]:underline [&_ul]:text-black/70 [&_ol]:text-black/70 [&_li]:text-black/70 [&_blockquote]:border-l-white/30 [&_blockquote]:text-black/60 [&_strong]:text-black [&_em]:text-black/90"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                ) : <p className="text-black/40 text-center py-12">Zacznij pisać treść HTML aby zobaczyć podgląd...</p>}
              </div>
            </div>

            {/* Publish Button */}
            <div className="sticky bottom-6">
              <Button onClick={() => setOpenConfirmDialog(true)} className={`w-full py-6 text-lg font-medium transition-all ${publishSuccess ? "bg-green-600 hover:bg-green-700" : "bg-white text-black hover:bg-white/90"}`}>
                {isPublishing ? <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Publikowanie...</> :
                 publishSuccess ? <> <Check className="w-5 h-5 mr-2" /> Opublikowano!</> :
                 <> <Send className="w-5 h-5 mr-2" /> Opublikuj do Firebase</>}
              </Button>
              {(!title || !htmlContent || !mainImage) && <p className="text-black/40 text-sm text-center mt-2">Wypełnij wszystkie wymagane pola oznaczone *</p>}
            </div>
          </motion.div>
          <div style={{gridColumn:1/4}} className="col-span-2 mt-12 bg-white/5 border border-black/10 rounded-xl p-6 space-y-4">
  <h2 className="text-lg font-medium text-black mb-4">Twoje wpisy blogowe</h2>
  {products.map(blog => (
    <div key={blog.id} className="flex justify-between items-center bg-white/10 rounded-xl p-4">
      <div>
        <p className="text-black font-medium">{blog.title}</p>
        <p className="text-black/60 text-sm">{blog.category}</p>
      </div>
      <div className="flex gap-2">
        {/* Edit */}
        <Button
          size="sm"
          onClick={() => router.push(`/?id=${blog.id}`)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Edytuj
        </Button>

        {/* Delete */}
        <Button
  size="sm"
  onClick={() => {
    setDeleteId(blog.id)
    setOpenDeleteDialog(true)
  }}
  className="bg-red-600 hover:bg-red-700"
>
  Usuń
</Button>

      </div>
    </div>
  ))}
</div>
        </div>
      </div>
    </div>
  )
}
