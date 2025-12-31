/**
 * Local testing script for news crawlers
 * Run with: bun run test-local.ts
 */

import { crawlT24 } from './src/crawlers/t24';
import { crawlEksisozluk } from './src/crawlers/eksisozluk';
import { crawlHackerNews } from './src/crawlers/hackernews';
import { crawlWikipedia } from './src/crawlers/wikipedia';
import { crawlReddit } from './src/crawlers/reddit';

async function testCrawler(name: string, crawlFn: () => Promise<any[]>) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log('='.repeat(60));

  try {
    const start = Date.now();
    const articles = await crawlFn();
    const duration = Date.now() - start;

    console.log(`✅ Success! Found ${articles.length} articles in ${duration}ms`);

    if (articles.length > 0) {
      const first = articles[0];
      console.log('\nFirst article:');
      console.log(`  Title: ${first.originalTitle.substring(0, 100)}...`);
      console.log(`  URL: ${first.originalUrl}`);
      console.log(`  Language: ${first.language}`);
      console.log(`  Content length: ${first.originalContent?.length || 0} chars`);
    }

    return { success: true, count: articles.length, duration };
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log('🚀 Starting local crawler tests...\n');
  console.log('Note: Running without SCRAPEDO_API_KEY - using direct fetch');

  const results = [];

  // Test HackerNews (easiest, has official API)
  results.push({
    name: 'HackerNews',
    ...(await testCrawler('HackerNews', () => crawlHackerNews()))
  });

  // Test Wikipedia (official API)
  results.push({
    name: 'Wikipedia',
    ...(await testCrawler('Wikipedia', () => crawlWikipedia()))
  });

  // Test Reddit (might need credentials but has fallback)
  results.push({
    name: 'Reddit',
    ...(await testCrawler('Reddit', () => crawlReddit({})))
  });

  // Test T24 (Turkish site, might be blocked)
  results.push({
    name: 'T24',
    ...(await testCrawler('T24', () => crawlT24()))
  });

  // Test Eksisozluk (Turkish site, might be blocked)
  results.push({
    name: 'Eksisozluk',
    ...(await testCrawler('Eksisozluk', () => crawlEksisozluk()))
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.name}: ${r.count} articles in ${r.duration}ms`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n💡 Tips:');
  console.log('   - If Turkish sites fail, add SCRAPEDO_API_KEY to bypass anti-bot');
  console.log('   - Reddit works better with API credentials');
  console.log('   - HackerNews and Wikipedia should always work');

  console.log('\n');
}

main().catch(console.error);
