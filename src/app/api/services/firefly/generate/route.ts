import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const image = formData.get('image') as File;
		const width = formData.get('width') as string;
		const height = formData.get('height') as string;

		console.log('Firefly Service:', {
			image: {
				name: image.name,
				size: `${(image.size / 1024 / 1024).toFixed(2)}MB`,
				type: image.type,
			},
			dimensions: `${width}x${height}`,
		});

		// Simulate API delay
		await new Promise(resolve => setTimeout(resolve, 2000));

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		console.error('Error in Firefly service:', error);
		return NextResponse.json({
			success: false,
			error: 'Failed to process image with Firefly',
		});
	}
}
