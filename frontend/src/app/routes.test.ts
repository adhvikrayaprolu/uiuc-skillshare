import { expect, it } from 'vitest';
import type { RouteObject } from 'react-router-dom';
import { router } from './routes';

function lazyRoutes(routes: RouteObject[], parent = ''): [string, NonNullable<RouteObject['lazy']>][] {
  return routes.flatMap((route) => {
    const path = route.index ? `${parent} (index)` : `${parent}/${route.path ?? ''}`.replace(/\/+/g, '/');
    const own = typeof route.lazy === 'function' ? [[path, route.lazy] as [string, NonNullable<RouteObject['lazy']>]] : [];
    return [...own, ...lazyRoutes(route.children ?? [], path)];
  });
}

it('loads a component for every on-demand screen', async () => {
  const routes = lazyRoutes(router.routes as RouteObject[]);
  expect(routes.length).toBeGreaterThan(15);
  for (const [path, load] of routes) {
    const module = await (load as () => Promise<{ Component?: unknown }>)();
    expect(typeof module.Component, path).toBe('function');
  }
});
