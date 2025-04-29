import { VideoHero } from "@/components/video-hero"
import { BowlScrollShowcase } from "@/components/bowl-scroll-showcase"
import { ProductCategoriesCarousel } from "@/components/product-categories-carousel"
import { Testimonials } from "@/components/testimonials"
import { Newsletter } from "@/components/newsletter"
import { ThemedBackground } from "@/components/themed-background"

export default function Home() {
  return (
    <ThemedBackground theme="default">
      <div className="flex flex-col min-h-screen mt-[-15em]">
        <VideoHero />
        <BowlScrollShowcase />
        <ProductCategoriesCarousel />
        <Testimonials />
        <Newsletter />
      </div>
    </ThemedBackground>
  )
}
