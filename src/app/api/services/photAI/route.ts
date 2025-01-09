import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
	region: process.env.AWS_REGION || 'us-east-1',
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
	},
});

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const image = formData.get('image') as File;
		const width = formData.get('width') as string;
		const height = formData.get('height') as string;
		const originalWidth = formData.get('originalWidth') as string;
		const originalHeight = formData.get('originalHeight') as string;

		// Convert File to Buffer
		const buffer = Buffer.from(await image.arrayBuffer());
		const fileName = `${Date.now()}-${image.name}`;

		// Upload to S3
		const uploadParams = {
			Bucket: process.env.AWS_S3_BUCKET || '',
			Key: fileName,
			Body: buffer,
			ContentType: image.type,
		};

		await s3Client.send(new PutObjectCommand(uploadParams));
		const imageUrl = `https://dev.rocketium.com/${encodeURIComponent(fileName)}`;

		console.log('imageUrl', imageUrl);

		const url = 'https://prodapi.phot.ai/external/api/v3/user_activity/outpaint';
		const headers = {
			'x-api-key': process.env.PHOT_AI_API_KEY || '',
			'Content-Type': 'application/json',
		};

		const data = {
			input_image_link: imageUrl,
			aspect_ratio: 'CUSTOM',
			custom_params: {
				canvas_w: Number(width),
				canvas_h: Number(height),
				center_x: 0,
				center_y: 0,
				scale: 1,
				rotation_angle: 0,
			},
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(data),
		});

		const { message, data: respData } = await response.json();

		if (message === 'Successful') {
			const orderId = respData.order_id;
			if (!orderId) {
				throw new Error('No order ID received from PhotAI');
			}

			// Poll for results
			const maxAttempts = 60; // 5 minutes maximum (5s interval * 60)
			let attempts = 0;

			while (attempts < maxAttempts) {
				const statusResponse = await fetch(
					`https://prodapi.phot.ai/external/api/v1/user_activity/order-status?order_id=${orderId}`,
					{
						method: 'GET',
						headers: {
							'x-api-key': process.env.PHOT_AI_API_KEY || '',
						},
					},
				);

				const statusData = await statusResponse.json();

				if (statusData.order_status === 'order_complete') {
					const imageUrl = statusData.output_urls?.[0];
					if (!imageUrl) {
						throw new Error('No image URL in completed response');
					}
					return NextResponse.json({
						success: true,
						imageUrl: imageUrl,
					});
				}

				// Wait 5 seconds before next attempt
				await new Promise(resolve => setTimeout(resolve, 5000));
				attempts++;
			}
			throw new Error('Polling timeout: Maximum attempts reached');
		}

		return NextResponse.json({
			success: false,
			error: 'Failed to process image with PhotAI',
		});
	} catch (error) {
		console.error('Error in PhotAI service:', error);
		return NextResponse.json({
			success: false,
			error: 'Failed to process image with PhotAI',
		});
	}
}
