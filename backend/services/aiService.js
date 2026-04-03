/**
 * Mock AI Service for Face Verification
 * In a real-world scenario, you would integrate:
 * - AWS Rekognition
 * - Azure Face API
 * - Face++
 * - Python-based OpenCV / face_recognition script
 */

exports.verifyFace = async (studentPhotoBase64, ownerUploadedPhotoBase64) => {
  console.log('--- AI FACE VERIFICATION INITIATED ---');
  // Check if photos exist
  if (!studentPhotoBase64 || !ownerUploadedPhotoBase64) {
    return {
      match: false,
      score: 0,
      message: "Both photos are required for AI verification"
    };
  }

  // MOCK LOGIC: We simulate a delay to mimic an external API call
  console.log('Connecting to Face AI Server...');
  await new Promise(resolve => setTimeout(resolve, 800));

  // If the base64 strings match exactly, it's a 100% match.
  // Otherwise, we randomly generate a score for demo purposes.
  // For safety in this demo, since users might upload the exact same image for testing,
  // we check exact match, otherwise we provide a high chance of success or fail.
  
  let score;
  let match;

  if (studentPhotoBase64 === ownerUploadedPhotoBase64) {
    score = 100; // Perfect match
    match = true;
    console.log(`Face match score: ${score}% (Exact image match)`);
  } else {
    // Generate a random score between 60 and 99
    score = Math.floor(Math.random() * (99 - 60 + 1) + 60);
    match = score >= 80;
    console.log(`Face match score: ${score}% (Simulated processing)`);
  }

  if (match) {
    console.log('AI verification passed.');
  } else {
    console.log('AI verification failed: Score below 80%.');
  }

  return {
    match,
    score,
    message: match ? "Faces matched successfully" : "Face match score below threshold"
  };
};

/**;   
 * Mock AI Face Detection
 * Only allows human faces, rejects screenshots/objects.
 */
exports.detectHumanFace = async (photoBase64) => {
  console.log('--- AI FACE DETECTION INITIATED ---');
  if (!photoBase64) return { hasFace: false, message: 'No photo provided' };

  // MOCK LOGIC: Simulate detection delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // For this demo:
  // We'll reject very small images (likely icons) 
  // and images that are clearly not photos (simulated by checking string length or patterns)
  // In reality, this would use face-api.js or similar
  
  if (photoBase64.length < 5000) {
    return { hasFace: false, message: 'Image too small or low quality to be a valid profile photo.' };
  }

  // Simulated failure for specific test case (e.g. if the user uploads a tiny placeholder)
  const isMockFailure = photoBase64.includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='); // 1x1 pixel
  
  if (isMockFailure) {
    return { hasFace: false, message: 'Only human face images are allowed.' };
  }

  console.log('Human face detected successfully.');
  return { hasFace: true, message: 'Face detected' };
};

/**
 * Mock Sentiment Analysis
 */
exports.analyzeSentiment = async (text) => {
  console.log('--- AI SENTIMENT ANALYSIS INITIATED ---');
  if (!text) return { score: 0, label: 'neutral' };

  // MOCK LOGIC: Simple keyword based sentiment for demo
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'delicious', 'clean', 'friendly', 'best', 'love', 'nice'];
  const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'dirty', 'rude', 'unhygienic', 'expensive', 'hate', 'slow'];

  let score = 50; // Neutral start
  const words = text.toLowerCase().split(/\s+/);

  words.forEach(word => {
    if (positiveWords.includes(word)) score += 10;
    if (negativeWords.includes(word)) score -= 10;
  });

  score = Math.max(0, Math.min(100, score));
  let label = 'neutral';
  if (score > 65) label = 'positive';
  if (score < 35) label = 'negative';

  console.log(`Sentiment Result: ${label} (Score: ${score}%)`);
  return { score, label };
};

/**
 * Mock Fake Review & Spam Detection
 */
exports.detectFakeReview = async (text, userId, messId) => {
  console.log('--- AI FAKE REVIEW DETECTION INITIATED ---');
  if (!text) return { isFake: false, confidence: 0 };

  // MOCK LOGIC: Check for spammy patterns
  const spamPatterns = [
    /https?:\/\//i, // Links
    /\b(buy|cheap|discount|offer|click here|subscribe)\b/i, // Marketing words
    /(.)\1{4,}/, // Repeated characters like "aaaaa"
  ];

  let spamScore = 0;
  spamPatterns.forEach(pattern => {
    if (pattern.test(text)) spamScore += 30;
  });

  // Very short reviews are suspicious
  if (text.length < 10) spamScore += 20;

  // Duplicate content check (Mock: if review is exactly same as a common spam template)
  const commonSpamTemplates = [
    "this is a great mess",
    "i love the food here",
    "very bad experience",
    "the staff is very rude"
  ];
  if (commonSpamTemplates.includes(text.toLowerCase())) {
    spamScore += 50;
  }

  // Repetitive text
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length > 5 && uniqueWords.size / words.length < 0.4) {
    spamScore += 40; // High repetition
  }

  const isFake = spamScore > 50;
  console.log(`Fake Detection Result: ${isFake ? 'SUSPICIOUS' : 'GENUINE'} (Confidence: ${spamScore}%)`);

  return {
    isFake,
    confidence: spamScore,
    reason: isFake ? 'Spam patterns or high repetition detected' : 'Normal pattern'
  };
};

/**
 * Mock Suspicious User Behavior Flagging
 */
exports.flagSuspiciousBehavior = async (user) => {
  console.log('--- AI BEHAVIOR ANALYSIS INITIATED ---');
  // MOCK LOGIC: Check login patterns or review frequency
  // For demo, we just return low risk unless it's a specific test case
  return {
    isSuspicious: false,
    riskScore: 10,
    flags: []
  };
};
