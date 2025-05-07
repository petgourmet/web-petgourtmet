import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container max-w-4xl py-12">
      <div className="bg-white rounded-3xl shadow-md p-8">
        <div className="flex justify-center mb-6">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>

        <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
        <Skeleton className="h-6 w-1/2 mx-auto mb-8" />

        <div>
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
        </div>

        <div className="my-6 h-px bg-gray-200" />

        <Skeleton className="h-32 w-full mb-6 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />

        <div className="mt-10 flex flex-col md:flex-row justify-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  )
}
