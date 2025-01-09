import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const image = formData.get('image') as File;
		const width = formData.get('width') as string;
		const height = formData.get('height') as string;
		const originalWidth = formData.get('originalWidth') as string;
		const originalHeight = formData.get('originalHeight') as string;

		const form = new FormData();
		form.append('image_file', image);
		form.append('extend_right', ((Number(width) - Number(originalWidth)) / 2).toString());
		form.append('extend_left', ((Number(width) - Number(originalWidth)) / 2).toString());
		form.append('extend_up', ((Number(height) - Number(originalHeight)) / 2).toString());
		form.append('extend_down', ((Number(height) - Number(originalHeight)) / 2).toString());

		const response = await fetch('https://clipdrop-api.co/uncrop/v1', {
			method: 'POST',
			headers: {
				'x-api-key': process.env.CLIP_DROP_API_KEY ?? '',
			},
			body: form,
		});

		const data = await response.arrayBuffer();

		return new NextResponse(data, {
			headers: {
				'Content-Type': 'image/jpeg',
			},
		});
	} catch (error) {
		console.error('Error in YouCam service:', error);
		return NextResponse.json({
			success: false,
			error: 'Failed to process image with YouCam',
		});
	}
}
