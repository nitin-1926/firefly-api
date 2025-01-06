'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

interface ImageDimensions {
	width: number;
	height: number;
}

export default function Home() {
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
	const [newWidth, setNewWidth] = useState<string>('');
	const [newHeight, setNewHeight] = useState<string>('');
	const [isUploading, setIsUploading] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [imageId, setImageId] = useState<string | null>(null);
	const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
	const [accessToken, setAccessToken] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const fetchAccessToken = async () => {
			try {
				const response = await fetch('/api/auth');
				const data = await response.json();
				if (data.access_token) {
					setAccessToken(data.access_token);
				} else {
					throw new Error('No access token received');
				}
			} catch (error) {
				console.error('Error fetching access token:', error);
				alert('Failed to initialize. Please try refreshing the page.');
			}
		};

		fetchAccessToken();
	}, []);

	const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file || !accessToken) return;

		if (file.size > 15 * 1024 * 1024) {
			alert('File size should not exceed 15MB');
			return;
		}

		// Reset states
		setGeneratedImageUrl(null);
		setImageId(null);
		setNewWidth('');
		setNewHeight('');

		const imageUrl = URL.createObjectURL(file as Blob);
		const img = new window.Image();
		img.onload = () => {
			setImageDimensions({
				width: img.width,
				height: img.height,
			});
		};
		img.src = imageUrl;
		setSelectedImage(imageUrl);

		try {
			setIsUploading(true);
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/upload', {
				method: 'POST',
				headers: {
					'x-access-token': accessToken,
				},
				body: formData,
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'Upload failed');
			}
			if (data.images?.[0]?.id) {
				setImageId(data.images[0].id);
			} else {
				throw new Error('No image ID received');
			}
		} catch (error) {
			console.error('Upload failed:', error);
			alert('Failed to upload image. Please try again.');
			setSelectedImage(null);
			setImageDimensions(null);
		} finally {
			setIsUploading(false);
		}
	};

	const handleGenerate = async () => {
		if (!newWidth || !newHeight || !imageId || !accessToken) return;

		const widthNum = parseInt(newWidth);
		const heightNum = parseInt(newHeight);

		if (isNaN(widthNum) || isNaN(heightNum) || widthNum <= 0 || heightNum <= 0) {
			alert('Please enter valid dimensions');
			return;
		}

		if (widthNum === imageDimensions?.width && heightNum === imageDimensions?.height) {
			alert('New dimensions must be different from original dimensions');
			return;
		}

		try {
			setIsGenerating(true);
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-access-token': accessToken,
				},
				body: JSON.stringify({
					imageId,
					width: widthNum,
					height: heightNum,
				}),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'Generation failed');
			}
			if (data.image?.source?.url) {
				setGeneratedImageUrl(data.image.source.url);
			} else {
				throw new Error('No generated image URL received');
			}
		} catch (error) {
			console.error('Generation failed:', error);
			alert('Failed to generate expanded image. Please try again.');
		} finally {
			setIsGenerating(false);
		}
	};

	const canGenerate =
		selectedImage && newWidth && newHeight && !isUploading && !isGenerating && imageDimensions !== null;

	return (
		<main className={styles.main}>
			<div className={styles.container}>
				<h1 className={styles.title}>Adobe Firefly Image Expander</h1>

				{selectedImage && imageDimensions && (
					<div className={styles.imageInfo}>
						<div className={styles.imageWrapper}>
							<Image
								src={selectedImage}
								alt="Preview"
								width={300}
								height={300}
								style={{
									objectFit: 'contain',
									width: '100%',
									height: 'auto',
								}}
							/>
						</div>
						<p>
							Original Dimensions: {imageDimensions.width}px × {imageDimensions.height}px
						</p>
					</div>
				)}

				{accessToken && (
					<div className={styles.uploadSection}>
						<input
							type="file"
							accept="image/*"
							onChange={handleFileSelect}
							ref={fileInputRef}
							style={{ display: 'none' }}
						/>
						<button
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading || !accessToken}
							className={styles.uploadButton}
						>
							{isUploading ? 'Uploading...' : 'Upload Image'}
						</button>
					</div>
				)}

				{selectedImage && (
					<div className={styles.dimensionsInput}>
						<input
							type="number"
							placeholder="Width"
							value={newWidth}
							onChange={e => setNewWidth(e.target.value)}
							min="1"
						/>
						<input
							type="number"
							placeholder="Height"
							value={newHeight}
							onChange={e => setNewHeight(e.target.value)}
							min="1"
						/>
					</div>
				)}

				{selectedImage && (
					<button onClick={handleGenerate} disabled={!canGenerate} className={styles.generateButton}>
						{isGenerating ? 'Generating...' : 'Generate'}
					</button>
				)}

				{generatedImageUrl && (
					<div className={styles.generatedImage}>
						<h2>Generated Image</h2>
						<div className={styles.imageWrapper}>
							<Image
								src={generatedImageUrl}
								alt="Generated"
								width={800}
								height={800}
								style={{
									objectFit: 'contain',
									width: '100%',
									height: 'auto',
								}}
							/>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}
