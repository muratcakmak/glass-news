/**
 * Test Eksisozluk crawling
 */

import { crawlEksisozluk, fetchEksisozlukDetail } from './src/crawlers/eksisozluk';
import { Env } from './src/types';

async function testEksi() {
  console.log('🧪 Testing Eksisozluk...\n');

  const env: Partial<Env> = {
    SCRAPEDO_API_KEY: process.env.SCRAPEDO_API_KEY,
  };

  console.log(`ScrapeDo API Key: ${env.SCRAPEDO_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

  try {
    console.log('Crawling Eksisozluk gündem...');
    const articles = await crawlEksisozluk(env as Env);

    console.log(`\n✅ Found ${articles.length} topics\n`);

    if (articles.length > 0) {
      const first = articles[0];
      console.log('First topic:');
      console.log(`  Title: ${first.originalTitle}`);
      console.log(`  URL: ${first.originalUrl}`);

      console.log('\n🔄 Fetching topic details...');
      const content = await fetchEksisozlukDetail(first.originalUrl, env as Env);

      console.log(`\n✅ Content fetched!`);
      console.log(`  Length: ${content.length} characters`);
      console.log(`  Preview: ${content.substring(0, 200)}...\n`);
    } else {
      console.log('⚠️  No topics found - might be blocked by Cloudflare');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEksi();
