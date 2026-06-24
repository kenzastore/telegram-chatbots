import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

// Demo sign-in is enabled unless explicitly turned off. It lets the dashboard be
// previewed with seeded data without configuring real Google OAuth credentials.
const demoEnabled = process.env.ENABLE_DEMO !== "false"
const demoEmail = process.env.DEMO_EMAIL || "demo@example.com"

const providers = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  )
}

if (demoEnabled) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {},
      authorize: async () => ({
        id: demoEmail,
        name: "Demo User",
        email: demoEmail,
      }),
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  // Production should set AUTH_SECRET. The fallback only applies outside production
  // so the dashboard can be previewed without extra configuration.
  secret:
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-insecure-secret-change-me" : undefined),
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email
      }
      return session
    },
  },
})
