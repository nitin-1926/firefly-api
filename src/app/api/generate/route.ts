import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

if (!process.env.NEXT_PUBLIC_FIREFLY_CLIENT_ID) {
	throw new Error('Missing required environment variable: NEXT_PUBLIC_FIREFLY_CLIENT_ID');
}

export async function POST(request: NextRequest) {
	try {
		const { imageId, width, height } = await request.json();
		const accessToken = request.headers.get('x-access-token');

		if (!imageId || !width || !height || !accessToken) {
			return NextResponse.json({ error: 'Image ID, dimensions, and access token are required' }, { status: 400 });
		}

		const body = {
			size: { width: parseInt(width), height: parseInt(height) },
			image: {
				source: { uploadId: imageId },
			},
		};

		const response = await axios.post('https://firefly-api.adobe.io/v3/images/expand', body, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'x-api-key': process.env.NEXT_PUBLIC_FIREFLY_CLIENT_ID,
				'Content-Type': 'application/json',
			},
		});

		return NextResponse.json(response.data);
	} catch (error) {
		console.error('Generation failed:', error);
		return NextResponse.json({ error: 'Failed to generate expanded image' }, { status: 500 });
	}
}
