# ShowRate Manager

A web application designed to help SDRs (Sales Development Representatives) improve their demo show rates. The platform seamlessly integrates with Google Calendar to automate the tracking of booked demos, send timely reminders via email and phone, and provide clear, actionable analytics.

## Features

- **Google Calendar Integration**: Securely connect SDR Google Calendars and automatically detect and import newly scheduled demos.
- **Demo Management Dashboard**: Display demos clearly organized in rows with company name, dates, reminder settings, and status.
- **Reminder Automation**: Checkbox-driven automatic email and SMS reminders with customizable templates.
- **Analytics and Reporting**: Real-time tracking of demo statuses with metrics like show rate percentage, no-show percentage, and rebooked demos count.
- **User Authentication**: Simple, secure login with email/password or Google OAuth.

## Tech Stack

- **Frontend**: Next.js, Tailwind CSS
- **Backend**: Next.js API routes, Google Calendar API integration
- **Database**: Supabase
- **Hosting**: Vercel
- **Authentication**: Supabase Auth (with Google OAuth support)

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account
- Google Cloud Platform account (for Google Calendar API)

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

     # Google Calendar API Configuration
     GOOGLE_CLIENT_ID=your-google-client-id
     GOOGLE_CLIENT_SECRET=your-google-client-secret
     GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
     ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `/app`: Next.js App Router pages and layouts
- `/components`: Reusable UI components
- `/lib`: Utility functions for Supabase and Google Calendar integration
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