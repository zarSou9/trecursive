import { API_KEYS, MIGRATION_TOKEN } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import Joi from 'joi';

interface RequestBody {
	map_repo: string;
}

const schema = Joi.object({
	map_repo: Joi.string().max(200).required()
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { value, error } = schema.validate(await request.json());
		if (error) throw { message: error.message || 'Invalid request', status: 400 };

		const { map_repo }: RequestBody = value;

		const API_KEY = request.headers.get('API_KEY');

		if (
			!API_KEYS.split(' ')
				.map((k) => k.split('.'))
				.filter(([r, _]) => !!r)
				.find(([r, k]) => r === map_repo && k === API_KEY)
		) {
			throw { message: 'Invalid API KEY', status: 401 };
		}

		const response = await fetch('https://api.github.com/repos/zarSou9/arm-migrator/dispatches', {
			method: 'POST',
			headers: {
				Accept: 'application/vnd.github.v3+json',
				Authorization: `token ${MIGRATION_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				event_type: 'update_research_map',
				client_payload: {
					map_repo: map_repo
				}
			})
		});

		if (!response.ok) {
			const responseData = await response.text();
			throw {
				message: `Failed to trigger GitHub workflow: ${response.status} ${response.statusText}`,
				status: 500,
				details: responseData
			};
		}

		return json({ message: 'Migration script called' }, { status: 200 });
	} catch (err: any) {
		return json(
			{ error: err.message || 'An unexpected error occurred', details: err.details },
			{ status: err.status || 500 }
		);
	}
};
