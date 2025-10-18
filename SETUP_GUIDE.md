# ChessMaster - Setup & Development Guide

## 🎯 Quick Start

Follow these steps to get your chess training platform up and running:

### Step 1: Install Dependencies

First, you need to install all required packages. Open PowerShell and run:

```powershell
npm install
```

This will install:
- Next.js and React
- Prisma (database ORM)
- Tailwind CSS (styling)
- bcryptjs, jsonwebtoken, zod (security & validation)

### Step 2: Database Setup

1. **Install PostgreSQL** (if not already installed)
   - Download from https://www.postgresql.org/download/
   - Or use a cloud provider like Supabase, Heroku, or Railway

2. **Create a database**
   ```sql
   CREATE DATABASE chessmaster;
   ```

3. **Create `.env` file**
   Copy the `.env.example` file:
   ```powershell
   Copy-Item .env.example .env
   ```

4. **Update DATABASE_URL in `.env`**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/chessmaster"
   ```
   
   Replace:
   - `username` with your PostgreSQL username (default is usually `postgres`)
   - `password` with your PostgreSQL password
   - `localhost` with your database host (if using cloud DB)
   - `5432` with your PostgreSQL port (default is 5432)

5. **Generate Prisma Client**
   ```powershell
   npx prisma generate
   ```

6. **Push database schema**
   ```powershell
   npx prisma db push
   ```

### Step 3: Run the Development Server

```powershell
npm run dev
```

Open your browser and visit: http://localhost:3000

## 📚 Application Overview

### User Roles

**Students:**
- Browse and search for trainers
- Book training lessons
- Register for tournaments
- Leave reviews for trainers

**Trainers:**
- Create and manage profile
- Set hourly rates and specialties
- Manage lessons and students
- Create and host tournaments

### Page Structure

1. **Home** (`/`) - Landing page with features and CTA
2. **Register** (`/register`) - Sign up as student or trainer
3. **Login** (`/login`) - User authentication
4. **Trainers** (`/trainers`) - Browse all trainers with filters
5. **Trainer Profile** (`/trainers/[id]`) - Detailed trainer information
6. **Tournaments** (`/tournaments`) - List all tournaments (TODO)
7. **Dashboard** (`/dashboard/student` or `/dashboard/trainer`) - User dashboard (TODO)

## 🔧 Development Tips

### Adding Sample Data

You can add sample trainers using Prisma Studio:

```powershell
npx prisma studio
```

This opens a browser interface where you can manually add data to test the app.

Or create a seed script in `prisma/seed.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create a trainer
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const trainer = await prisma.user.create({
    data: {
      email: 'trainer@example.com',
      password: hashedPassword,
      name: 'Magnus Carlsen',
      role: 'TRAINER',
      trainerProfile: {
        create: {
          title: 'World Champion',
          bio: 'Former World Chess Champion with 20 years of experience',
          specialties: ['Openings', 'Endgames', 'Strategy'],
          rating: 2800,
          hourlyRate: 150,
          experience: 20,
          featured: true,
        }
      }
    }
  });
  
  console.log('Seed data created!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

Run the seed:
```powershell
node prisma/seed.js
```

### Testing the API

Use tools like Postman or Thunder Client to test API endpoints:

**Register User:**
```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "STUDENT"
}
```

**Login:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Get Trainers:**
```http
GET http://localhost:3000/api/trainers?page=1&limit=12
```

### Viewing Database

To view and edit your database visually:
```powershell
npx prisma studio
```

## 🎨 Customization

### Changing Colors

Edit Tailwind configuration or use the existing gradient classes:
- `from-blue-600 to-purple-600` - Primary gradient
- `from-purple-600 to-pink-600` - Secondary gradient

### Adding New Features

1. **Create API Route**: Add new file in `app/api/[feature]/route.js`
2. **Create Page**: Add new page in `app/[feature]/page.js`
3. **Add to Navbar**: Update `components/Navbar.js`

## 🐛 Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Check firewall settings

**Error**: `P1001: Can't reach database server at localhost:5432`
- PostgreSQL might not be running
- Start PostgreSQL service

### Prisma Issues

**Error**: `@prisma/client did not initialize yet`
- Run: `npx prisma generate`
- Restart dev server

**Error**: `Schema engine error`
- Your database URL might be wrong
- Check .env file

### Build Errors

**Error**: `Module not found`
- Run: `npm install`
- Delete `node_modules` and `.next` folders, then reinstall

## 📦 Deployment

### Deploying to Vercel

1. Push your code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
5. Deploy!

### Database for Production

Use one of these hosted PostgreSQL services:
- **Supabase** (free tier available)
- **Railway** (free tier available)
- **Heroku** (paid)
- **AWS RDS** (paid)

## 🔐 Security Notes

**Important**: Before deploying to production:

1. Change JWT_SECRET to a strong random string
2. Use environment variables for all secrets
3. Enable HTTPS
4. Set up CORS properly
5. Add rate limiting
6. Implement proper error handling

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🆘 Getting Help

If you encounter issues:
1. Check the error message carefully
2. Review this setup guide
3. Check Prisma/Next.js documentation
4. Search for similar issues on GitHub/Stack Overflow

---

Happy coding! ♟️ 🎉
