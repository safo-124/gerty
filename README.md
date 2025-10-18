# ChessMaster - Chess Training & Tournament Platform 🏆♟️

A comprehensive web application for chess training and tournaments, connecting students with expert trainers and hosting competitive events.

## ✨ Features

### For Students
- 🔍 **Find Expert Trainers** - Browse and filter trainers by specialty, rating, and price
- 📚 **Book Lessons** - Schedule one-on-one training sessions
- 🏆 **Join Tournaments** - Compete in various tournament formats
- 📈 **Track Progress** - Monitor your improvement and rating progression
- ⭐ **Leave Reviews** - Rate and review trainers

### For Trainers
- 👨‍🏫 **Create Profile** - Showcase your expertise, rating, and specialties
- 💼 **Manage Lessons** - Schedule and organize training sessions
- 🎯 **Host Tournaments** - Create and organize chess tournaments
- 📊 **View Analytics** - Track students and earnings

### For Super Admins
- ✅ **Approve Trainers** - Vet new instructors before they go live
- 🧑‍🎓 **Monitor Students** - Review learner growth and onboarding
- 🌍 **Steward Fund Me** - Track donations fueling outreach programs
- 🗓️ **Launch Tournaments** - Spin up events on behalf of trainers

### General Features
- 🔐 **Secure Authentication** - Role-based access for students and trainers
- 📱 **Fully Responsive** - Beautiful mobile and desktop experience
- 🎨 **Modern UI** - Gradient designs, animations, and smooth transitions
- 🌙 **Dark Mode** - Full dark mode support
- 📬 **Automated Reminders** - Configurable email nudges before lessons and events
- 🌍 **Fund Me Outreach** - Public storytelling page with donor recognition and transparent impact stats

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS 4
- **Authentication**: JWT-based auth
- **Language**: JavaScript (ES6+)

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chess
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database credentials and JWT secret:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/chessmaster"
   JWT_SECRET="your-super-secret-jwt-key"
   RESEND_API_KEY="your-resend-api-key"
   NOTIFICATION_FROM_EMAIL="ChessMaster <notifications@yourdomain.com>"
   APP_BASE_URL="http://localhost:3000"
   # Optional overrides
   DEFAULT_REMINDER_OFFSET_MINUTES=60
   REMINDER_LOOKAHEAD_MINUTES=180
   ```

4. **Set up the database**
   ```bash
npx prisma generate
npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

### ⏰ Reminder Service

Automated lesson reminders are delivered by a lightweight Node script. Configure a cron job (or task scheduler) to run it periodically:

```bash
npm run reminders
```

The script checks for upcoming lessons within the configured look-ahead window and emails trainers and students according to their dashboard preferences. Ensure your environment variables are set (see above) before enabling the job.

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
chess/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── admin/        # Super admin management APIs
│   │   ├── fund-me/      # Donation collection endpoints
│   │   ├── trainers/     # Trainer management
│   │   ├── tournaments/  # Tournament management
│   │   └── lessons/      # Lesson management
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── fund-me/          # Fundraising landing page & donation form
│   ├── trainers/         # Trainers listing & profiles
│   ├── tournaments/      # Tournament pages
│   └── dashboard/        # User dashboards (student, trainer, admin)
├── components/
│   ├── ui/               # Reusable UI components
│   └── Navbar.js         # Navigation component
├── contexts/
│   └── AuthContext.js    # Authentication context
├── lib/
│   ├── prisma.js         # Prisma client
│   ├── auth.js           # Auth utilities
│   └── validation.js     # Input validation schemas
└── prisma/
    └── schema.prisma     # Database schema
```

## 🗄️ Database Schema

### Main Models:
- **User** - Base user account (students & trainers)
- **TrainerProfile** - Extended trainer information
- **StudentProfile** - Extended student information
- **Tournament** - Tournament details and management
- **Lesson** - Training session bookings
- **Review** - Trainer reviews and ratings

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Trainers
- `GET /api/trainers` - List trainers (with filters)
- `GET /api/trainers/[id]` - Get trainer profile
- `PUT /api/trainers/profile` - Update trainer profile
- `POST /api/trainers/[id]/reviews` - Add review

### Tournaments
- `GET /api/tournaments` - List tournaments
- `POST /api/tournaments` - Create tournament
- `GET /api/tournaments/[id]` - Get tournament details
- `POST /api/tournaments/[id]/register` - Register for tournament

### Lessons
- `GET /api/lessons` - List lessons
- `POST /api/lessons` - Book lesson
- `PUT /api/lessons/[id]` - Update lesson
- `DELETE /api/lessons/[id]` - Cancel lesson

### Fund Me & Donations
- `GET /api/fund-me/donations` - Public donation summary
- `POST /api/fund-me/donations` - Submit a new donation

### Super Admin Console
- `GET /api/admin/trainers` - List trainer profiles, filterable by status
- `POST /api/admin/trainers/[id]/approve` - Approve a trainer
- `GET /api/admin/students` - List all students with profile details
- `GET /api/admin/funds` - View donation ledger and totals
- `GET /api/admin/tournaments` - Review tournaments and participant counts
- `POST /api/admin/tournaments` - Create a tournament on behalf of an organizer

## 🎨 Design Features

- **Gradient Backgrounds** - Beautiful blue, purple, and pink gradients
- **Animated Cards** - Hover effects and smooth transitions
- **Responsive Grid** - Adapts to all screen sizes
- **Modern Typography** - Clean, readable fonts
- **Icon Integration** - Chess-themed emojis and icons
- **Dark Mode** - Full dark theme support

## 🔒 Security

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation with Zod
- SQL injection prevention via Prisma

## 📱 Mobile Optimization

All pages are fully responsive with:
- Touch-friendly interfaces
- Mobile navigation menu
- Optimized layouts for small screens
- Fast loading times

## 🚧 Future Enhancements

- [ ] Payment integration (Stripe/PayPal)
- [ ] Real-time chess board for lessons
- [ ] Live tournament brackets
- [ ] Chat between students and trainers
- [ ] Email notifications
- [ ] Video lesson recordings
- [ ] Advanced analytics dashboard

## 📝 License

This project is open source and available under the MIT License.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for chess enthusiasts worldwide ♟️

