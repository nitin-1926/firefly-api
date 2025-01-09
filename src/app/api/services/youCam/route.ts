import { NextRequest, NextResponse } from 'next/server';
import JSEncrypt from 'jsencrypt';

export async function POST(request: NextRequest) {
	try {
		// Validate input data
		const formData = await request.formData();
		const image = formData.get('image') as File;
		const width = formData.get('width') as string;
		const height = formData.get('height') as string;
		const originalWidth = formData.get('originalWidth') as string;
		const originalHeight = formData.get('originalHeight') as string;

		if (!image || !width || !height || !originalWidth || !originalHeight) {
			throw new Error('Missing required parameters');
		}

		// Helper functions
		const getAccessToken = async () => {
			const encrypt = new JSEncrypt();
			encrypt.setPublicKey(process.env.YOU_CAM_SECRET_KEY || '');
			const IdToken = encrypt.encrypt(
				`client_id=${process.env.YOU_CAM_API_KEY}&timestamp=${new Date().getTime()}`,
			);

			const response = await fetch('https://yce-api-01.perfectcorp.com/s2s/v1.0/client/auth', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					client_id: process.env.YOU_CAM_API_KEY || '',
					id_token: IdToken,
				}),
			});

			const { status, result } = await response.json();
			if (status !== 200) {
				throw new Error('Failed to get access token');
			}
			return result.access_token;
		};

		const initiateFileUpload = async (accessToken: string) => {
			const response = await fetch('https://yce-api-01.perfectcorp.com/s2s/v1.0/file/out-paint', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					files: [
						{
							content_type: image.type,
							file_name: image.name,
						},
					],
				}),
			});
			const data = await response.json();
			const fileData = data.result.files[0];
			return {
				fileId: fileData.file_id,
				uploadUrl: fileData.requests[0].url,
			};
		};

		const uploadImage = async (uploadUrl: string, file: File) => {
			const response = await fetch(uploadUrl, {
				method: 'PUT',
				headers: {
					'Content-Type': file.type,
				},
				body: file,
			});
			if (!response.ok) {
				throw new Error('Image upload failed');
			}
		};

		const getTaskStatus = async (accessToken: string, taskId: string) => {
			const response = await fetch(
				`https://yce-api-01.perfectcorp.com/s2s/v1.0/task/out-paint?task_id=${taskId}`,
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			);

			const { status, result } = await response.json();
			if (status !== 200) {
				throw new Error('Failed to get task status');
			}
			return result;
		};

		const pollTaskStatus = async (accessToken: string, taskId: string): Promise<string> => {
			const MAX_ATTEMPTS = 30; // Maximum number of polling attempts
			let attempts = 0;

			while (attempts < MAX_ATTEMPTS) {
				const {
					polling_interval,
					status: taskStatus,
					error,
					results: taskResults,
				} = await getTaskStatus(accessToken, taskId);

				if (taskStatus === 'error') {
					throw new Error(error);
				}

				if (taskStatus === 'success') {
					const imageUrl = taskResults?.[0]?.data?.[0]?.url;
					if (!imageUrl) {
						throw new Error('No image URL in successful response');
					}
					return imageUrl;
				}

				if (taskStatus === 'running') {
					attempts++;
					// Wait for the polling interval before next attempt
					await new Promise(resolve => setTimeout(resolve, polling_interval || 1000));
					continue;
				}

				throw new Error(`Unexpected task status: ${taskStatus}`);
			}

			throw new Error('Polling timeout: Maximum attempts reached');
		};

		// Execute steps sequentially
		console.log('Step 1: Getting access token...');
		const accessToken = await getAccessToken();
		if (!accessToken) {
			throw new Error('Failed to obtain access token');
		}
		console.log('Access token obtained successfully');

		console.log('Step 2: Initiating file upload...');
		const { fileId, uploadUrl } = await initiateFileUpload(accessToken);
		if (!fileId || !uploadUrl) {
			throw new Error('Failed to initialize file upload');
		}
		console.log('File upload initialized successfully');

		console.log('Step 3: Uploading image...');
		await uploadImage(uploadUrl, image);
		console.log('Image uploaded successfully');

		console.log('Step 4: Creating processing task...');
		const taskResponse = await fetch('https://yce-api-01.perfectcorp.com/s2s/v1.0/task/out-paint', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				request_id: 0,
				payload: {
					file_sets: {
						src_ids: [fileId], // Use the fileId from step 2
					},
					actions: [
						{
							id: 0,
							params: {
								output_width: Number(width),
								output_height: Number(height),
								input_x: (Number(width) - Number(originalWidth)) / 2,
								input_y: (Number(height) - Number(originalHeight)) / 2,
								input_width: Number(originalWidth),
								input_height: Number(originalHeight),
								crop_input_x: 0,
								crop_input_y: 0,
								crop_input_width: Number(originalWidth),
								crop_input_height: Number(originalHeight),
							},
						},
					],
				},
			}),
		});

		const { status, result, error_code } = await taskResponse.json();
		console.log('Task creation response:', { status, result, error_code });

		if (status !== 200 || !result?.task_id) {
			throw new Error(`Failed to create task: ${error_code}`);
		}
		console.log('Task created successfully');

		console.log('Step 5: Polling for results...');
		const imageUrl = await pollTaskStatus(accessToken, result.task_id);
		console.log('Processing completed successfully');

		return NextResponse.json({
			success: true,
			imageUrl: imageUrl,
		});
	} catch (error) {
		console.error('Error in YouCam service:', error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to process image with YouCam',
			},
			{ status: 500 },
		);
	}
}
