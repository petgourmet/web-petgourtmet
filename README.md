# PetGourmet Web Application

A Next.js application for pet food customization and ordering.

## Setup Instructions

### 1. Environment Variables

Copy the environment example file and configure your credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values:

#### Supabase Configuration
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select existing project
3. Go to Settings > API
4. Copy the following values:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for admin operations)

#### MercadoPago Configuration
1. Go to [MercadoPago Developers](https://www.mercadopago.com/developers/)
2. Create an application
3. Get your credentials:
   - `MERCADOPAGO_ACCESS_TOKEN`: Access token
   - `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`: Public key

#### Cloudinary Configuration
1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Get your credentials:
   - `CLOUDINARY_CLOUD_NAME`: Cloud name
   - `CLOUDINARY_API_KEY`: API key
   - `CLOUDINARY_API_SECRET`: API secret

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` - Next.js 13+ app directory with pages and layouts
- `components/` - Reusable React components
- `lib/` - Utility libraries and configurations
- `hooks/` - Custom React hooks
- `contexts/` - React context providers
- `public/` - Static assets
- `styles/` - CSS and styling files

## Features

- Pet food plan customization
- Product catalog with filtering
- Shopping cart functionality
- Payment integration with MercadoPago
- User authentication with Supabase
- Image uploads with Cloudinary
- Responsive design with Tailwind CSS

## Technologies Used

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Supabase (Database & Auth)
- MercadoPago (Payments)
- Cloudinary (Image Management)

## Common Issues

### Environment Variables Error
If you see "Missing Supabase environment variables", make sure you've:
1. Created `.env.local` file
2. Added all required Supabase variables
3. Restarted the development server

### CSS Import Errors
If you encounter CSS module import errors, try:
1. Clear Next.js cache: `rm -rf .next`
2. Restart the development server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support, contact the development team or create an issue in the repository.
