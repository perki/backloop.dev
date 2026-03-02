import { Plugin } from 'vite';

/**
 * Vite plugin for backloop.dev HTTPS local development
 * @param hostname - Subdomain to use (e.g., 'myapp' becomes myapp.backloop.dev)
 * @param port - Optional port number for the dev server
 * @returns Vite plugin configuration
 */
declare function backloop(hostname?: string, port?: number): Plugin;

export default backloop;
