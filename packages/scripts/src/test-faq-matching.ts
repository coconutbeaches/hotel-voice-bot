import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const testQueries = [
  'What time do you check in?',
  'When is breakfast?',
  'Do you have wifi?',
  'Is there parking?',
  'How do I get to the pool?',
  'What is your address?',
  'Can I get room service?',
  'Do you allow dogs?',
  'How do I call the front desk?'
];

async function testFAQMatching() {
  console.log('Testing FAQ matching...\n');
  
  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    
    try {
      // Get all FAQs
      const { data: faqs, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching FAQs:', error);
        continue;
      }
      
      // Simple keyword matching
      const queryLower = query.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;
      
      for (const faq of faqs) {
        let score = 0;
        
        // Check keywords
        for (const keyword of faq.keywords) {
          if (queryLower.includes(keyword.toLowerCase())) {
            score += 1;
          }
        }
        
        // Check question words
        const questionWords = faq.question.toLowerCase().split(' ');
        const queryWords = queryLower.split(' ');
        
        for (const word of queryWords) {
          if (word.length > 3 && questionWords.includes(word)) {
            score += 0.5;
          }
        }
        
        if (score > bestScore) {
          bestMatch = faq;
          bestScore = score;
        }
      }
      
      if (bestMatch && bestScore > 0.5) {
        console.log(`✓ Match found (score: ${bestScore}): "${bestMatch.question}"`);
        console.log(`  Answer: ${bestMatch.answer.substring(0, 100)}...`);
      } else {
        console.log('✗ No good match found');
      }
      
    } catch (error) {
      console.error('Error testing query:', error);
    }
    
    console.log('');
  }
}

testFAQMatching();
