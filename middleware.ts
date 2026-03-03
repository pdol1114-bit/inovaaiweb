import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
    // Match all pathnames except internals and static files
    matcher: ['/((?!_next|_vercel|api/|.*\\..*).*)']
};
