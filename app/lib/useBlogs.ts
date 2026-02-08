import { create } from "zustand"
import { collection, FieldValue, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "./friebase"
export interface BlogDocument {
    id:string
    title: string
    slug: string
    category: string
    excerpt: string
    mainImage: string | null
    htmlContent: string
    createdAt: Timestamp
    updatedAt: Timestamp
    published: boolean
  }
interface ProductStore {
    products: BlogDocument[]
    isLoaded: boolean
    unsubscribe?: () => void
    listenToProducts: () => void
  }
export const useBlogs = create<ProductStore>((set, get) => ({
    products: [],
    isLoaded: false,
  
    listenToProducts: () => {
      if (get().unsubscribe) return // already listening
  
      const unsub = onSnapshot(collection(db, "blogs"), (snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data() as BlogDocument)
      
        set({ products: data, isLoaded: true })
      })
      set({ unsubscribe: unsub })
    },
  }))
  
  export const formatDate = (timestamp: Timestamp | FieldValue | null | undefined):string => {
    if (!timestamp) return ""
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    }
    return ""
  }

