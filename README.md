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

## Stripe Integration Setup

To set up the Stripe integration for premium subscriptions:

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Navigate to the Stripe Dashboard
3. Create two products:
   - **Pro Plan**: $29/month recurring
   - **Enterprise Plan**: $99/month recurring
4. Note the price IDs for each product and update them in your `.env.local` file:
   ```
   NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_123...
   NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID=price_456...
   ```
5. Set up webhook forwarding for local testing:
   - Install the Stripe CLI: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
   - Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Update your `.env.local` with the webhook secret:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_123...
     ```

## Testing Subscriptions

To test the subscription flow:

1. Use Stripe test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
2. For all test cards, use any future expiration date, any 3-digit CVC, and any postal code.
3. After successful checkout, you'll be redirected back to the profile page with your updated subscription.

## Managing Subscriptions

Stripe provides a customer portal for subscription management. This can be integrated by:

1. Creating a portal link in Stripe
2. Redirecting the user to this link when they want to manage their subscription
3. Setting up a return URL for when the user is done with the portal

## Acknowledgments

- Inspired by the needs of SDRs to improve demo show rates
- Built with modern, minimalistic design principles 