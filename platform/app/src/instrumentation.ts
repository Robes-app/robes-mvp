import type { Instrumentation } from 'next';

// Server render/route errors reach PostHog error tracking (anonymous; see server/analytics).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { errorReporter } = await import('./server/analytics');
  await errorReporter.capture(err, {
    path: request.path.split('?')[0],
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    source: 'next',
  });
};
