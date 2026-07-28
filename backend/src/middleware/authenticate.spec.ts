import { describe, it, expect, vi } from 'vitest';

vi.mock('../logging', () => ({
	logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}));

import { isAuthenticated } from './authenticate.js';

describe('isAuthenticated middleware', () => {
	function createReq(authenticated: boolean) {
		return {
			isAuthenticated: vi.fn().mockReturnValue(authenticated),
			method: 'GET',
			originalUrl: '/api/test',
		};
	}

	function createRes() {
		const res: any = {};
		res.status = vi.fn().mockReturnValue(res);
		res.json = vi.fn().mockReturnValue(res);
		return res;
	}

	it('should call next() when user is authenticated', () => {
		const req = createReq(true);
		const res = createRes();
		const next = vi.fn();

		isAuthenticated(req as any, res, next);

		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('should return 401 when user is not authenticated', () => {
		const req = createReq(false);
		const res = createRes();
		const next = vi.fn();

		isAuthenticated(req as any, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: Please log in.' });
	});
});
