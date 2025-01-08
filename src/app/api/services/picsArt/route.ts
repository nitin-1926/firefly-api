import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const image = formData.get('image') as File;
		const width = formData.get('width') as string;
		const height = formData.get('height') as string;
		const originalWidth = formData.get('originalWidth') as string;
		const originalHeight = formData.get('originalHeight') as string;

		// Simulate API delay
		// await new Promise(resolve => setTimeout(resolve, 3500));

		// Convert image to RGBA format using sharp
		const arrayBuffer = await image.arrayBuffer();
		const rgbaBuffer = await sharp(Buffer.from(arrayBuffer))
			.ensureAlpha() // Ensure image has alpha channel
			.toFormat('png')
			.toBuffer();

		const form = new FormData();
		form.append('count', '1');
		form.append('format', 'PNG');
		form.append('mode', 'sync');
		form.append('negative_prompt', 'distorted images and labels');
		form.append(
			'prompt',
			`Extend and complete this image by adding ${+width - +originalWidth} pixels to both the left and right sides and ${+height - +originalHeight} pixels to both the top and bottom. Maintain the same style, lighting, and perspective as the original image. Ensure the extension blends seamlessly with the existing content and preserves the overall composition. The added areas should be a natural continuation of the scene.`,
		);
		form.append('image', new Blob([rgbaBuffer], { type: 'image/png' }));

		const options = {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'X-Picsart-API-Key': process.env.PICSART_API_KEY || '',
			},
			body: form,
		};

		const response = await fetch('https://genai-api.picsart.io/v1/painting/outpaint', options);
		const data = await response.json();

		return NextResponse.json({
			success: data.status === 'success',
			imageUrl: data.data[0].url,
		});
	} catch (error) {
		console.log('PicsArt Service Error:', error);
		return NextResponse.json({
			success: false,
			error: 'Failed to process image with PicsArt',
		});
	}
}
