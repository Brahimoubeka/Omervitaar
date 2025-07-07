# Omervita E-Commerce Platform

A modern, secure e-commerce platform built with Node.js, Express, and Supabase.

## Features

- **🛒 Complete E-Commerce**: Product catalog, shopping cart, checkout, and order management
- **👑 Admin Dashboard**: Secure admin panel for managing products, orders, and analytics
- **🔐 Authentication**: JWT-based authentication with role-based access control
- **📱 Responsive Design**: Mobile-first design with Bootstrap
- **🌐 SEO Optimized**: Clean URLs, meta tags, and proper redirects
- **☁️ Cloud Storage**: Supabase integration for database and file storage
- **🎨 Modern UI**: Beautiful, user-friendly interface in Arabic

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Frontend**: HTML5, CSS3, Bootstrap 5, Vanilla JavaScript
- **Authentication**: JWT with HTTP-only cookies
- **Email**: Nodemailer with Gmail

## Security Features

- Role-based access control (Admin/User)
- Protected admin routes with JWT verification
- HTTP-only cookies for secure token storage
- Input validation and sanitization
- HTTPS enforcement
- Security headers (XSS protection, CSRF protection)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Supabase account
- Gmail account for email services

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file with your configuration:
   ```env
   JWT_SECRET=your_jwt_secret
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Project Structure

```
├── public/              # Static files
│   ├── admin/          # Protected admin pages
│   ├── css/           # Stylesheets
│   ├── js/            # Client-side JavaScript
│   └── images/        # Static images
├── routes/             # API routes
├── utils/              # Utility functions
├── server.js          # Main server file
└── supabase.js        # Supabase configuration
```

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/forgot-password` - Password reset

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/admin/products` - Create product (Admin only)
- `PUT /api/admin/products/:id` - Update product (Admin only)
- `DELETE /api/admin/products/:id` - Delete product (Admin only)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/admin/orders` - Get all orders (Admin only)

## License

This project is proprietary and confidential.

## Support

For support, please contact the development team.
