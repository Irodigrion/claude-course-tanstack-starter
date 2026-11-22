import { QueryClient } from "@tanstack/react-query";

/**
 * Router context with a fresh QueryClient. Called once per router: on the
 * server that means per request, so cached data is never shared between users.
 */
export function getContext() {
	const queryClient = new QueryClient({
		// Data prefetched during SSR stays fresh briefly instead of being
		// refetched immediately after hydration.
		defaultOptions: { queries: { staleTime: 30_000 } },
	});
	return { queryClient };
}
