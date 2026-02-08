import BlogEditorPage from "@/components/mainComponent";
import { Suspense } from "react";

export default function Page(){

  return <Suspense fallback={<div>Loading</div>}>
    <BlogEditorPage />
  </Suspense>
}