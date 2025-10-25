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

- Framework: Next.js 15 (App Router)
- Database: PostgreSQL with Prisma ORM
- Styling: Tailwind CSS 4
- Authentication: JWT-based auth
- Language: JavaScript (ES6+)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

## 🛠️ Installation

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd chess
   ```

1. Install dependencies

   ```bash
   npm install
   ```

1. Set up environment variables

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

1. Set up the database

   ```bash
   npx prisma generate
   npx prisma db push
   ```

1. Run the development server

   ```bash
   npm run dev
   ```

   On Windows PowerShell, if you see a script execution error (PSSecurityException), either run PowerShell as Administrator and execute:

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

   or use this alternative command that doesn't rely on PowerShell script execution:

   ```bash
   npm run dev:node
   ```

1. Open your browser

   Go to <http://localhost:3000>

### ⏰ Reminder Service

Automated lesson reminders are delivered by a lightweight Node script. Configure a cron job (or Task Scheduler on Windows) to run it periodically:

```bash
npm run reminders
```

The script checks for upcoming lessons within the configured look-ahead window and emails trainers and students according to their dashboard preferences. Ensure your environment variables are set (see above) before enabling the job.

## 📁 Project Structure

```txt
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

### Main Models

- User — Base user account (students & trainers)
- TrainerProfile — Extended trainer information
- StudentProfile — Extended student information
- Tournament — Tournament details and management
- Lesson — Training session bookings
- Review — Trainer reviews and ratings

## 🔑 API Endpoints

### Authentication

- POST /api/auth/register — Register new user
- POST /api/auth/login — Login
- GET /api/auth/me — Get current user

### Trainers

- GET /api/trainers — List trainers (with filters)
- GET /api/trainers/[id] — Get trainer profile
- PUT /api/trainers/profile — Update trainer profile
- POST /api/trainers/[id]/reviews — Add review

### Tournaments

- GET /api/tournaments — List tournaments
- POST /api/tournaments — Create tournament
- GET /api/tournaments/[id] — Get tournament details
- POST /api/tournaments/[id]/register — Register for tournament

Online vs In-person:

- Tournaments now have a `mode`: `IN_PERSON` (default) or `ONLINE`.
- Admins can select the mode when creating a tournament.

Online play APIs:

- POST /api/admin/tournaments/[id]/games — Admin create an online game for a tournament `{ whiteUserId, blackUserId, round? }`
- GET /api/games/[id] — Fetch game state (FEN, PGN, turn, status)
- POST /api/games/[id]/move — Submit a move `{ from, to, promotion? }` (validated server-side)

Online play UI:

- Visit `/play/[gameId]` to open the game room with a live board.

### Lessons

- GET /api/lessons — List lessons
- POST /api/lessons — Book lesson
- PUT /api/lessons/[id] — Update lesson
- DELETE /api/lessons/[id] — Cancel lesson

### Fund Me & Donations

- GET /api/fund-me/donations — Public donation summary
- POST /api/fund-me/donations — Submit a new donation (optional `causeId`)
- GET /api/fund-me/causes — Public list of active causes with totals
- GET /api/fund-me/causes/[id] — Public cause details with totals and recent donations

### Super Admin Console

- GET /api/admin/trainers — List trainer profiles, filterable by status
- POST /api/admin/trainers/[id]/approve — Approve a trainer
- GET /api/admin/students — List all students with profile details
- GET /api/admin/funds — View donation ledger and totals
- GET /api/admin/fund-me/causes — List causes (optionally include inactive)
- POST /api/admin/fund-me/causes — Create a cause (title, description?, goalAmount?, image?)
- PATCH /api/admin/fund-me/causes/[id] — Update cause fields or toggle `active`
- DELETE /api/admin/fund-me/causes/[id]?mode=soft|hard — Delete cause; soft=deactivate, hard=remove if no donations
- GET /api/admin/tournaments — Review tournaments and participant counts
- POST /api/admin/tournaments — Create a tournament on behalf of an organizer

## 👑 Admin Sign-in & Stats

Quickly get an admin user and verify dashboard stats.

1. Seed an admin user (defaults shown below):

   ```bash
   npm run seed:admin
   ```

   You can override with environment variables in `.env`:

   ```env
   ADMIN_EMAIL=admin@gerty.local
   ADMIN_PASSWORD=ChangeMe!123
   ADMIN_NAME=Super Admin
   ```

1. Sign in at `/login` using the seeded credentials. After login, you'll be redirected to `/dashboard/admin`.

1. The Overview shows:

   - Total Trainers: count of users with role TRAINER (pending + approved)
   - Students Present Today: distinct students with lessons scheduled today with status SCHEDULED or COMPLETED
   - Fund Me Impact and Tournaments summaries

If no lessons exist yet, Students Present Today may be 0 — create lessons for today to see this number rise.

## 🛒 Store (Chess Items & Materials)

This project includes a simple store where visitors can browse products, add them to a cart, and place an order (email and line items; no payment integration by default).

- Public page: `/store`
- List products: `GET /api/store/products`
- Place order: `POST /api/store/orders` with `{ email, items: [{ productId, quantity }] }`

### Admin endpoints

- Upload image to Blob: `POST /api/admin/store/upload` (multipart/form-data: `file`)
- Create product: `POST /api/admin/store/products` with `{ name, description?, price, stock, images: [{ url }] }`
- List products (admin): `GET /api/admin/store/products?includeDeleted=1`
- Update product: `PATCH /api/admin/store/products/[id]` (supports full image replacement via `images: [{ url }]`)
- Delete product: `DELETE /api/admin/store/products/[id]?mode=soft|hard` (soft marks `deletedAt`; hard only if no order items)
- Bulk actions: `POST /api/admin/store/products/bulk` with `{ action: 'enable'|'disable'|'setPrice'|'setStock', ids: string[], value?: number }`

Admin UI: Dashboard → Store tab to add products, edit inline, toggle active, soft/hard delete, and run bulk enable/disable or price/stock updates

### Blob Storage Setup (Vercel Blob)

Image uploads use Vercel Blob via a server route. Configure the read-write token in `.env`:

```env
BLOB_READ_WRITE_TOKEN=your_vercel_blob_rw_token
```

Notes:

- The admin upload route streams files to `https://blob.vercel-storage.com/<generated-key>` with the token.
- In production, restrict tokens appropriately and rotate them when necessary.


## 🎨 Design Features

- Gradient backgrounds and subtle animations
- Responsive grid layouts (mobile → desktop)
- Modern typography and iconography
- Dark mode support

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

---

Built with ❤️ for chess enthusiasts worldwide ♟️

## ♟️ Engine / AI

By default, the app runs Stockfish 17.1 locally (Node Emscripten WASM) to compute AI moves for live games. The helper at `lib/stockfish.js` asks for a best move given a FEN with configurable `movetime`, `depth`, and `skill` and is used by the live APIs.

If you prefer an external Stockfish API (recommended when you don’t want to run the engine in-process), configure these environment variables and the app will try the API first and fall back to the local engine if needed:

- `STOCKFISH_API_URL` (or `NEXT_PUBLIC_STOCKFISH_API_URL`): A POST endpoint that accepts JSON `{ fen, movetime?, depth?, skill? }` and returns a JSON best move in any of these fields: `{ bestmove }`, `{ bestMove }`, `{ move }`, `{ uci }`.
- `STOCKFISH_API_KEY` (optional): Added as `Authorization: Bearer <key>`.
- `STOCKFISH_API_TIMEOUT_MS` (optional): Request timeout in milliseconds (default 5000).

Client implementation: `lib/stockfish-api.js`.

Smokes to validate the setup:

- Local engine: `npm run smoke:engine`
- External API: `npm run smoke:engine:api`
- In-memory live flow (human move + AI reply + clocks): `npm run smoke:live-ai`


