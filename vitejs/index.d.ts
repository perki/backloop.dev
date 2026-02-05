/**
 * Vite plugin for backloop.dev HTTPS local development
 * @param hostname - Subdomain to use (e.g., 'myapp' becomes myapp.backloop.dev)
 * @param port - Optional port number for the dev server
 * @returns Vite plugin configuration
 */
declare function backloop(hostname?: string, port?: number): {
  name: string;
  apply: 'serve';
  config(config: Record<string, unknown>): void;
};

export default backloop;