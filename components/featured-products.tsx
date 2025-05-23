import type React from "react"

interface Product {
  id: number
  name: string
  price: number
  imageUrl: string
}

interface FeaturedProductsProps {
  products: Product[]
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({ products }) => {
  return (
    <div className="featured-products">
      <h2>Featured Products</h2>
      <div className="product-list">
        {products.map((product) => (
          <div key={product.id} className="product-item">
            <img src={product.imageUrl || "/placeholder.svg"} alt={product.name} />
            <h3>{product.name}</h3>
            <p>Price: $ MXN {product.price}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeaturedProducts
