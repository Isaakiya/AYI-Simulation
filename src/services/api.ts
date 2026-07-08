export interface InterviewStartResponse {
  sessionId: string;
  message: string;
}

export interface FeedbackResponse {
  overallScore: number;
  communicationAnalysis: string;
  technicalAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
}

export async function startInterviewSession(): Promise<InterviewStartResponse> {
  const response = await fetch('/api/interview/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Unable to start interview session.');
  }

  return response.json();
}

export async function submitInterviewTranscript(transcript: string): Promise<FeedbackResponse> {
  const response = await fetch('/api/interview/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok) {
    throw new Error('Unable to submit transcript for feedback.');
  }

  return response.json();
}
