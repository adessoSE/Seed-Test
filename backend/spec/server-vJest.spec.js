const steps = require('../src/database/stepTypes');

const base_url = 'http://localhost:8080/api';

describe('Server', () => {
	describe('GET /api', () => {
		it('returns status code 200', async () => {
			await fetch(base_url).then((response) => {
				expect(response.status).toBe(200);
			})
		});
	});
	describe('GET /api/stepTypes', () => {
		it('returns status code 200', async () => {
			const result = steps(); // import steps from definition
			await fetch(`${base_url}/stepTypes`)
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
