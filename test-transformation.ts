/**
 * Test AI content transformation with Grok
 */

import { transformContent } from './src/transformers/content';
import { NewsArticle, Env } from './src/types';

async function testTransformation() {
  console.log('🧪 Testing AI Content Transformation with Grok...\n');

  const env: Partial<Env> = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    RESEARCH_MODEL: process.env.RESEARCH_MODEL || 'x-ai/grok-4.1-fast',
  };

  console.log(`Model: ${env.RESEARCH_MODEL}`);
  console.log(`API Key: ${env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

  if (!env.OPENROUTER_API_KEY) {
    console.log('⚠️  OPENROUTER_API_KEY not found');
    return;
  }

  // Test with a Turkish article from T24
  const turkishArticle: NewsArticle = {
    id: 'test-1',
    source: 't24',
    originalTitle: "CHP'li Yavuzyılmaz'dan otoyol ve köprülerin geçiş ücretleri zammına tepki: Yaparsa AKP yapar!",
    originalContent: "CHP Genel Başkan Yardımcısı ve Parti Sözcüsü Deniz Yavuzyılmaz, otoyol ve köprülerin geçiş ücretlerine yapılan zamları eleştirdi. Yavuzyılmaz, 'Bu ülkede her şeyi zamlamak varsa, bunu ancak AKP yapar' dedi.",
    originalUrl: 'https://t24.com.tr/test',
    crawledAt: new Date().toISOString(),
    language: 'tr'
  };

  console.log('Original Turkish Article:');
  console.log(`  Title: ${turkishArticle.originalTitle}`);
  console.log(`  Content: ${turkishArticle.originalContent.substring(0, 100)}...\n`);

  console.log('🔄 Transforming with AI (Grok)...\n');

  try {
    const start = Date.now();
    const transformed = await transformContent(turkishArticle, env as Env);
    const duration = Date.now() - start;

    console.log('✅ Transformation Complete!\n');
    console.log(`Duration: ${duration}ms\n`);
    console.log('Transformed Article (English):');
    console.log(`  Title: ${transformed.transformedTitle}`);
    console.log(`  Content: ${transformed.transformedContent?.substring(0, 300)}...`);
    console.log(`  Tags: ${transformed.tags?.join(', ')}`);
    console.log(`\nFull content length: ${transformed.transformedContent?.length || 0} characters`);

    // Check if it's in English
    if (transformed.transformedContent && transformed.transformedContent.includes('CHP')) {
      console.log('\n⚠️  Warning: Content might still contain Turkish words');
    } else {
      console.log('\n✅ Content appears to be in English!');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testTransformation();
