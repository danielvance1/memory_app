// The logged-in user, as attached to each request by the session middleware.
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

// Teach TypeScript that Express requests may carry a `user`. After this,
// `req.user` type-checks everywhere in the server.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
