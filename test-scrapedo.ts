/**
 * Test ScrapeDo for T24 full article fetching
 */

import { crawlT24, fetchT24ArticleDetail } from './src/crawlers/t24';
import { Env } from './src/types';

async function testScrapeDo() {
  console.log('🧪 Testing T24 with ScrapeDo...\n');

  // Mock environment with ScrapeDo API key
  const env: Partial<Env> = {
    SCRAPEDO_API_KEY: process.env.SCRAPEDO_API_KEY,
  };

  console.log(`ScrapeDo API Key: ${env.SCRAPEDO_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

  if (!env.SCRAPEDO_API_KEY) {
    console.log('⚠️  SCRAPEDO_API_KEY not found in .dev.vars');
    console.log('Add it to .dev.vars file and try again\n');
    return;
  }

  try {
    // Step 1: Crawl RSS
    console.log('Step 1: Crawling T24 RSS...');
    const articles = await crawlT24(env as Env);
    console.log(`✅ Found ${articles.length} articles from RSS\n`);

    if (articles.length === 0) {
      console.log('No articles found');
      return;
    }

    // Step 2: Fetch full article
    const firstArticle = articles[0];
    console.log('Step 2: Fetching full article content...');
    console.log(`  Title: ${firstArticle.originalTitle.substring(0, 80)}...`);
    console.log(`  URL: ${firstArticle.originalUrl}`);
    console.log(`  RSS Description: ${firstArticle.originalContent.substring(0, 100)}...`);

    console.log('\n🔄 Fetching full content via ScrapeDo...');
    const fullContent = await fetchT24ArticleDetail(firstArticle.originalUrl, env as Env);

    console.log(`\n✅ Full content fetched!`);
    console.log(`  Length: ${fullContent.length} characters`);
    console.log(`  Preview: ${fullContent.substring(0, 200)}...\n`);

    if (fullContent.length > firstArticle.originalContent.length) {
      console.log('✅ SUCCESS: Full article is longer than RSS description');
      console.log(`   RSS: ${firstArticle.originalContent.length} chars`);
      console.log(`   Full: ${fullContent.length} chars`);
    } else {
      console.log('⚠️  WARNING: Full article same length as RSS (ScrapeDo might have failed)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testScrapeDo();
