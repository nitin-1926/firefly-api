'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import styles from './page.module.css';

export default function Home() {
	const [image, setImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [width, setWidth] = useState('');
	const [height, setHeight] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { results, originalDimensions, setOriginalDimensions, resetResults, setResult } = useGenerationStore();

	// Auto-fill dimensions when original dimensions change
	useEffect(() => {
		if (originalDimensions) {
			setWidth((originalDimensions.width + 200).toString());
			setHeight((originalDimensions.height + 200).toString());
		}
	}, [originalDimensions]);

	// Cleanup blob URL when component unmounts
	useEffect(() => {
		return () => {
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}
		};
	}, [blobUrl]);

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setImage(file);
			// Create blob URL for the image
			const newBlobUrl = URL.createObjectURL(file);
			if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			}
			setBlobUrl(newBlobUrl);

			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
				// Get original dimensions
				const img = new Image();
				img.onload = () => {
					setOriginalDimensions({
						width: img.width,
						height: img.height,
					});
				};
				img.src = reader.result as string;
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!image || !width || !height || !blobUrl) {
			setError('Please fill in all fields');
			return;
		}

		setLoading(true);
		setError(null);
		resetResults();

		// const services = ['firefly', 'photAI', 'youCam', 'xDesign'];
		const services = ['picsArt', 'clipDrop', 'photAI'];
		// const services = ['photAI'];

		try {
			// Start all service requests in parallel
			const promises = services.map(async service => {
				const requestStart = Date.now();
				const formData = new FormData();
				formData.append('image', image);
				formData.append('width', width);
				formData.append('height', height);
				formData.append('originalWidth', originalDimensions?.width.toString() ?? '0');
				formData.append('originalHeight', originalDimensions?.height.toString() ?? '0');

				const response = await fetch(`/api/services/${service}${service === 'firefly' ? '/generate' : ''}`, {
					method: 'POST',
					body: formData,
				});

				const requestEnd = Date.now();
				const requestTime = (requestEnd - requestStart) / 1000;
				console.log(`Request time for ${service}: ${requestTime} seconds`);

				if (!response.ok) {
					setResult(service, blobUrl, requestTime);
					throw new Error(`Failed to process image with ${service}`);
				}

				// Handle both JSON and binary responses
				const contentType = response.headers.get('content-type');
				let data;
				if (contentType?.includes('application/json')) {
					data = await response.json();
					console.log('Response for service ', service, 'is ', data);
					setResult(service, data.imageUrl ?? blobUrl, requestTime);
				} else {
					// Handle binary response
					const blob = await response.blob();
					const imageUrl = URL.createObjectURL(blob);
					console.log('Binary response for service ', service);
					setResult(service, imageUrl, requestTime);
				}
			});

			// Wait for all services to complete
			await Promise.all(promises);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className={styles.main}>
			<h1>Image Extension Comparison</h1>

			<div className={styles.container}>
				<div className={styles.inputSection}>
					<form onSubmit={handleSubmit} className={styles.form}>
						<div>
							<label htmlFor="image">Upload Image:</label>
							<input type="file" id="image" accept="image/*" onChange={handleImageChange} required />
						</div>

						{imagePreview && (
							<div className={styles.preview}>
								<h3>Input Image:</h3>
								<img src={imagePreview} alt="Preview" />
								{originalDimensions && (
									<p className={styles.dimensions}>
										Original Dimensions: {originalDimensions.width}px × {originalDimensions.height}
										px
									</p>
								)}
							</div>
						)}

						<div className={styles.dimensions}>
							<div>
								<label htmlFor="width">New Width:</label>
								<input
									type="number"
									id="width"
									value={width}
									onChange={e => setWidth(e.target.value)}
									required
								/>
							</div>

							<div>
								<label htmlFor="height">New Height:</label>
								<input
									type="number"
									id="height"
									value={height}
									onChange={e => setHeight(e.target.value)}
									required
								/>
							</div>
						</div>

						<button type="submit" disabled={loading}>
							{loading ? 'Processing...' : 'Generate Extensions'}
						</button>
					</form>

					{error && <div className={styles.error}>{error}</div>}
				</div>

				{Object.keys(results).length > 0 && (
					<div className={styles.results}>
						<h2>Results</h2>
						<div className={styles.grid}>
							{Object.entries(results).map(([service, result]) => (
								<div key={service} className={styles.resultCard}>
									<div className={styles.serviceHeader}>
										<h3>{service.replace('_', ' ').toUpperCase()}</h3>
										<span className={styles.timestamp}>
											Generated in {result.requestTime.toFixed(1)}s
										</span>
									</div>
									<img
										src={result.imageUrl}
										alt={`${service} result`}
										className={styles.resultImage}
									/>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
