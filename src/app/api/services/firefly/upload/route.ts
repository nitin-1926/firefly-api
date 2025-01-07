import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Clean the API key by removing any whitespace, line breaks, or carriage returns
const apiKey = process.env.NEXT_PUBLIC_FIREFLY_CLIENT_ID?.replace(/[\r\n\s]/g, '');

if (!apiKey) {
	throw new Error('Missing required environment variable: NEXT_PUBLIC_FIREFLY_CLIENT_ID');
}

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const accessToken = request.headers.get('x-access-token');

		console.log('Access token: ');

		if (!file || !accessToken) {
			return NextResponse.json({ error: 'File and access token are required' }, { status: 400 });
		}

		// Convert File to Buffer instead of ReadableStream
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		console.log(file.type, file.size);

		const config = {
			method: 'post',
			url: 'https://firefly-api.adobe.io/v2/storage/image',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'x-api-key': apiKey,
				'Content-Type': file.type,
				'Content-Length': file.size,
			},
			data: buffer,
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
		};

		const response = await axios(config);
		console.log('Upload response: ', response.data);
		return NextResponse.json(response.data);
	} catch (error) {
		console.error('Upload failed:', error);
		return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
	}
}
