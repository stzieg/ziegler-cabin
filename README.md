# Cabin Management App

A React + TypeScript application for managing cabin access with invitation-only registration and admin controls.

## 🚀 Quick Start

**New to this project?** Start here: **[GETTING_STARTED.md](./GETTING_STARTED.md)**

This guide will take you from zero to a fully working app in about 10 minutes.

## 📋 Setup Checklist

- [ ] Supabase project created
- [ ] `.env` file configured with credentials
- [ ] Database migrations run
- [ ] Admin user created
- [ ] First login successful

**Detailed guides:**
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Complete 10-minute setup guide
- **[RUN_MIGRATIONS.md](./RUN_MIGRATIONS.md)** - How to set up database tables
- **[BOOTSTRAP_ADMIN.md](./BOOTSTRAP_ADMIN.md)** - How to create your first admin user
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Advanced Supabase configuration

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: CSS Modules
- **Backend**: Supabase (Auth + Database)
- **Testing**: Vitest + React Testing Library + fast-check (property-based testing)

## 🛠️ Development

### Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env .env.local
   ```

2. **Add your API keys to `.env.local`:**
   - Get Supabase credentials from your [Supabase dashboard](https://supabase.com/dashboard)
   - Get OpenWeather API key from [OpenWeatherMap](https://openweathermap.org/api)
   - Configure email provider (use 'console' for development)

3. **Never commit `.env.local`** - it contains your secret keys!

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build
```

## 📁 Project Structure

```
src/
├── components/       # React components
├── contexts/         # React contexts (Auth, Supabase)
├── utils/           # Utility functions (Supabase client, validation)
├── types/           # TypeScript type definitions
├── styles/          # Global styles
└── test/            # Test utilities and setup

supabase/
├── migrations/      # Database schema migrations
├── bootstrap_admin.sql  # Script to create first admin
└── seed.sql        # Sample data (optional)
```

## 🔐 Features

- **Invitation-only registration** - Only users with valid invitation tokens can register
- **Admin panel** - Admins can send invitations and manage users
- **User profiles** - Users can view and update their profile information
- **Secure authentication** - Powered by Supabase Auth with Row Level Security
- **Network resilience** - Automatic retry and recovery from network issues

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit tests** - Component and utility function tests
- **Integration tests** - Full user flow testing
- **Property-based tests** - Generative testing with fast-check
- **Accessibility tests** - ARIA compliance and keyboard navigation

Run tests with:
```bash
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Important**: Don't use quotes around the values!

### Database Setup

1. Run migrations in Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`

2. Create your first admin user:
   - Follow instructions in `BOOTSTRAP_ADMIN.md`

## 📖 Documentation

- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Start here for complete setup
- **[RUN_MIGRATIONS.md](./RUN_MIGRATIONS.md)** - Database setup guide
- **[BOOTSTRAP_ADMIN.md](./BOOTSTRAP_ADMIN.md)** - Admin user creation
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Advanced configuration
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide

## 🐛 Troubleshooting

### "Unable to connect to server"
- Check `.env` file has correct credentials (no quotes)
- Restart dev server after changing `.env`

### "relation 'profiles' does not exist"
- Run database migrations (see `RUN_MIGRATIONS.md`)

### Can't log in
- Verify user exists in Supabase Auth
- Verify profile exists in profiles table
- Check that profile `id` matches auth user `id`

### Don't see Admin Panel
- Check `is_admin = true` in profiles table
- Try logging out and back in

**More help**: See troubleshooting sections in the setup guides.

## 🤝 Contributing

This is a family cabin management project. If you're adding features:

1. Write tests for new functionality
2. Follow existing code patterns
3. Update documentation as needed
4. Test with real Supabase instance

## 📝 License

Private family project - not for public distribution.

---

**Ready to get started?** → [GETTING_STARTED.md](./GETTING_STARTED.md)
