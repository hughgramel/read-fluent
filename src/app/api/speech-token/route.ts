import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';

    if (!subscriptionKey) {
      return NextResponse.json(
        { error: 'Azure Speech key not configured' },
        { status: 500 }
      );
    }

    // Get token from Azure Cognitive Services
    const tokenResponse = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get token from Azure');
    }

    const token = await tokenResponse.text();

    return NextResponse.json({
      token,
      region,
    });
  } catch (error) {
    console.error('Error getting speech token:', error);
    return NextResponse.json(
      { error: 'Failed to get speech token' },
      { status: 500 }
    );
  }
} 