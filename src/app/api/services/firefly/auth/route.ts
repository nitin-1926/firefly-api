import { NextResponse } from 'next/server';
import axios from 'axios';

if (!process.env.NEXT_PUBLIC_FIREFLY_CLIENT_ID || !process.env.FIREFLY_CLIENT_SECRET) {
	throw new Error('Missing required environment variables for Adobe Firefly authentication');
}

export async function GET() {
	try {
		const formData = new URLSearchParams();
		formData.append('grant_type', 'client_credentials');
		formData.append('client_id', process.env.NEXT_PUBLIC_FIREFLY_CLIENT_ID || '');
		formData.append('client_secret', process.env.FIREFLY_CLIENT_SECRET || '');
		formData.append('scope', 'openid,AdobeID,session,additional_info,read_organizations,firefly_api,ff_apis');

		const response = await axios.post('https://ims-na1.adobelogin.com/ims/token/v3', formData, {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		return NextResponse.json({ access_token: response.data.access_token });
	} catch (error) {
		console.error('Error fetching access token:', error);
		return NextResponse.json({ error: 'Failed to fetch access token' }, { status: 500 });
	}
}
