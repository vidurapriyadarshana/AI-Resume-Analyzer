import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ScoreCircle from './ScoreCircle'
import { usePuterStore } from '~/lib/Puter';

const ResumeCard = ({ resume }: { resume: Resume }) => {


    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');

    useEffect(() => {
        const loadResumes = async () => {
            const blob = await fs.read(resume.imagePath);
            if (!blob) return;

            let url = URL.createObjectURL(blob);
            setResumeUrl(url);
        }

        loadResumes();
    }, [resume.imagePath]);

    return (
        <Link to={`/resume/${resume.id}`} className='resume-card animate-in fade-in duration-1000'>
            <div className='resume-card-header'>
                <div className='flex flex-col gap-2'>

                    {resume.companyName && <h1 className='!text-black font-bold break-words'>{resume.companyName}</h1>}
                    {resume.jobTitle && <h3 className='text-lg break-words text-gray-500'>{resume.jobTitle}</h3>}

                    {!resume.companyName && !resume.jobTitle && <h1 className='!text-black font-bold'>Resume</h1>}
                </div>

                <div className='flex-shrink-0'>
                    <ScoreCircle score={resume.feedback.overallScore} />
                </div>
            </div>


            {resumeUrl && (
                <div className='gradient-border animate-in fade-in duration-1000'>
                    <div className='w-full h-full'>
                        <img src={resumeUrl} alt="resume" className='w-full h-[350px] max-sm:h-[200px] object-cover object-top' />
                    </div>
                </div>
            )}
        </Link>
    )
}

export default ResumeCard