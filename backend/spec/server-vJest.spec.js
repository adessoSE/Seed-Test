const steps = require('../src/database/stepTypes');

const backendHost = process.env.BACKEND_HOST || 'localhost';
const backendPort = process.env.BACKEND_PORT || '8080';

const baseUrl = `http://${backendHost}:${backendPort}/api`;


describe('Server', () => {
	describe('GET /api', () => {
		it('returns status code 200', async () => {
			await fetch(baseUrl).then((response) => {
				expect(response.status).toBe(200);
			})
		});
	});
	describe('GET /api/stepTypes', () => {
		it('returns status code 200', async () => {
			const result = steps(); // import steps from definition
			await fetch(`${baseUrl}/stepTypes`)
			.then((response) => {
				expect(response.status).toBe(200);
				return response.json()
			}).then((body) => {
				body = body.map(obj => {// remove (changing) db id from test
					const {_id, ...rest} = obj;
					return rest;
				})
				for (let i = 0; i < 15; i++){// TODO: after merge of part1-Merging-step-selection controll all
					expect(body).toContainEqual(result[i]);
				}
			});
		});
	});
});
