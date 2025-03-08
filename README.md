# ShowRate Manager

A web application designed to help SDRs (Sales Development Representatives) improve their demo show rates. The platform allows you to manually track booked demos, send timely reminders via email and phone, and provide clear, actionable analytics.

## Features

- **Demo Management Dashboard**: Display demos clearly organized in rows with company name, dates, reminder settings, and status.
- **Manual Demo Entry**: Easily add new demos with all relevant information.
- **Reminder Automation**: Checkbox-driven automatic email and SMS reminders with customizable templates.
- **Analytics and Reporting**: Real-time tracking of demo statuses with metrics like show rate percentage, no-show percentage, and rebooked demos count.
- **User Authentication**: Simple, secure login with email/password.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase
- **Hosting**: Vercel
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jdorber94/bluebird.git
   cd bluebird
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add the following variables:
     ```
     # Supabase Configuration
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```

4. Set up Supabase:
   - Create a new project in Supabase
   - Create the following table:
     ```sql
     create table demos (
       id uuid default uuid_generate_v4() primary key,
       user_id uuid references auth.users not null,
       company_name text not null,
       date_booked timestamp with time zone not null,
       date_of_demo timestamp with time zone not null,
       email_reminder boolean default true,
       phone_reminder boolean default false,
       status text default 'Scheduled',
       email_reminder_sent boolean default false,
       phone_reminder_sent boolean default false,
       attendees jsonb,
       description text,
       location text,
       position integer not null default 0,
       created_at timestamp with time zone default now()
     );
     ```

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/app`: Next.js App Router pages and layouts
- `/components`: Reusable UI components
- `/lib`: Utility functions for Supabase integration
- `/styles`: Global styles and Tailwind CSS configuration
- `/public`: Static assets

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the needs of SDRs to improve demo show rates
- Built with modern, minimalistic design principles 