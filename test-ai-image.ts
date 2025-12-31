/**
 * Test AI Image Generation in isolation
 */

// Mock the AI binding for local testing
const testImageGeneration = async () => {
  console.log('🎨 Testing AI Image Generation...\n');

  const prompt = `Create a minimalist geometric illustration that represents technology and innovation.
    The mood should be dynamic and energetic.
    Use rich colors and composition suitable for a news article thumbnail.
    No text, no people, no logos.
    Abstract and artistic interpretation only.`;

  console.log('Prompt:', prompt);
  console.log('\n⏳ This test requires the deployed worker with AI binding.');
  console.log('Testing via API endpoint...\n');

  // Test by triggering a single article crawl and checking the result
  const API_URL = 'https://news-data.omc345.workers.dev';

  try {
    // Trigger a small crawl
    console.log('1. Triggering Wikipedia crawl (6 articles)...');
    const crawlRes = await fetch(`${API_URL}/api/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: ['wikipedia'] })
    });
    const crawlData = await crawlRes.json();
    console.log(`   ✓ Crawl started: ${crawlData.count} articles\n`);

    // Wait for processing
    console.log('2. Waiting 90 seconds for AI processing...');
    await new Promise(resolve => setTimeout(resolve, 90000));

    // Fetch the latest article
    console.log('3. Fetching latest article...');
    const articlesRes = await fetch(`${API_URL}/api/articles?source=wikipedia&limit=1`);
    const articlesData = await articlesRes.json();

    if (articlesData.articles && articlesData.articles.length > 0) {
      const article = articlesData.articles[0];
      console.log(`   ✓ Got article: ${article.id}\n`);

      console.log('4. Checking thumbnail:');
      console.log(`   URL: ${article.thumbnailUrl}`);

      if (article.thumbnailUrl.includes('/thumbnails/')) {
        console.log('   ✅ AI-generated thumbnail detected!\n');

        // Try to fetch the actual image
        const imageUrl = `${API_URL}${article.thumbnailUrl}`;
        console.log('5. Testing image fetch...');
        console.log(`   URL: ${imageUrl}`);

        const imageRes = await fetch(imageUrl);
        console.log(`   Status: ${imageRes.status} ${imageRes.statusText}`);
        console.log(`   Content-Type: ${imageRes.headers.get('content-type')}`);

        if (imageRes.ok) {
          const blob = await imageRes.blob();
          console.log(`   Size: ${blob.size} bytes`);
          console.log(`   Type: ${blob.type}`);
          console.log('\n   ✅ AI Image Generation is WORKING!\n');
        } else {
          console.log('\n   ❌ Image fetch failed\n');
        }
      } else {
        console.log('   ⚠️  Using placeholder image (AI generation may have failed or quota exceeded)');
        console.log('   This is expected if you hit the 60/day limit\n');
      }

      // Show current AI usage
      console.log('6. Article details:');
      console.log(`   Title: ${article.transformedTitle || article.originalTitle}`);
      console.log(`   Tags: ${article.tags?.join(', ') || 'None'}`);

    } else {
      console.log('   ❌ No articles found\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
};

testImageGeneration();
