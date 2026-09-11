import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID ||
        process.env.GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_ID,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET ||
        process.env.GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
    LinkedIn({
      clientId:
        process.env.AUTH_LINKEDIN_ID ||
        process.env.LINKEDIN_CLIENT_ID ||
        process.env.LINKEDIN_ID,
      clientSecret:
        process.env.AUTH_LINKEDIN_SECRET ||
        process.env.LINKEDIN_CLIENT_SECRET ||
        process.env.LINKEDIN_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnStudio = nextUrl.pathname.startsWith("/studio");

      if (isOnStudio) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to /login
      }
      return true;
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token?.sub || user?.id;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
};
