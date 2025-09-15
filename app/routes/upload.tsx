'use client'; // ensure this component only runs on the client (Next.js)

import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import FileUploader from '~/components/FileUploader';
import NavBar from '~/components/NavBar';
import { usePuterStore } from '~/lib/Puter';
import { genarateUUID } from '~/utils/utils';
import { prepareInstructions } from 'const';

const UploadPage = () => {
    const { auth, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');

    // handle file selection from FileUploader
    const handleFileSelect = async (selectedFile: File | null) => {
        setFile(selectedFile);
        setPreviewUrl('');

        if (!selectedFile) return;

        if (typeof window === 'undefined') return; // only run in browser

        // dynamic import to avoid SSR errors
        const { convertPdfToImage } = await import('~/lib/pdf2img');
        const result = await convertPdfToImage(selectedFile);

        if (result.error) {
            console.error(result.error);
            return;
        }

        setPreviewUrl(result.imageUrl); // show thumbnail
    };

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file,
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        setIsProcessing(true);
        setStatusText('Uploading the file...');

        const uploadedFile = await fs.upload([file]);
        if (!uploadedFile) return setStatusText('Error: Failed to upload file');

        setStatusText('Converting to image...');
        const { convertPdfToImage } = await import('~/lib/pdf2img');
        const imageFile = await convertPdfToImage(file);
        if (!imageFile.file) return setStatusText('Error: Failed to convert PDF to image');

        setStatusText('Uploading the image...');
        const uploadedImage = await fs.upload([imageFile.file]);
        if (!uploadedImage) return setStatusText('Error: Failed to upload image');

        setStatusText('Preparing data...');
        const uuid = genarateUUID();

        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName,
            jobTitle,
            jobDescription,
            feedback: '',
        };

        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText('Analyzing ...');
        const feedback = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({ jobTitle, jobDescription })
        );

        if (!feedback) return setStatusText('Error: Failed to analyze resume');

        const feedbackText =
            typeof feedback.message.content === 'string'
                ? feedback.message.content
                : feedback.message.content[0].text;

        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText('Analysis complete! Redirecting...');
        console.log('data', data);
        // navigate(`/results/${uuid}`); // optional redirect
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget.closest('form');
        if (!form || !file) return;

        const formData = new FormData(form);
        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <NavBar />
            <section className="main-section px-4 py-8 max-w-3xl mx-auto">
                <div className="page-heading">
                    <h1 className="text-3xl font-bold mb-4">Smart feedback for your dream job</h1>

                    {isProcessing ? (
                        <>
                            <h2 className="text-xl mb-4">{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2 className="text-xl mb-4">Drop your resume or an ATS score and get improvement tips</h2>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" required />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" required />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea
                                    rows={5}
                                    name="job-description"
                                    placeholder="Job Description"
                                    id="job-description"
                                    required
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            {previewUrl && (
                                <div className="mb-4">
                                    <p className="mb-2">PDF Preview:</p>
                                    <img src={previewUrl} alt="PDF Preview" className="border w-40 h-auto" />
                                </div>
                            )}

                            <button className="primary-button mt-4" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default UploadPage;
