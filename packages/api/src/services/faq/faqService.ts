import { SupabaseClient } from '@hotel-voice-bot/integrations/supabase';
import { OpenAIClient } from '@hotel-voice-bot/integrations/openai';
import { logger } from '../../utils/logger.js';

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  language: string;
  category: string;
  keywords: string[];
  is_active: boolean;
}

export interface FAQMatch {
  faq: FAQ;
  confidence: number;
  matchType: 'exact' | 'keyword' | 'semantic';
}

export class FAQService {
  private supabase: SupabaseClient;
  private openai: OpenAIClient;

  constructor() {
    this.supabase = new SupabaseClient();
    this.openai = new OpenAIClient();
  }

  async findBestMatch(userQuery: string, language: string = 'en'): Promise<FAQMatch | null> {
    try {
      // Get active FAQs for the language
      const { data: faqs, error } = await this.supabase.client
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .eq('language', language);

      if (error) {
        logger.error('Error fetching FAQs:', error);
        return null;
      }

      if (!faqs || faqs.length === 0) {
        logger.warn('No FAQs found for language:', language);
        return null;
      }

      // Try semantic matching with OpenAI
      const semanticMatch = await this.findSemanticMatch(userQuery, faqs);
      if (semanticMatch) {
        return semanticMatch;
      }

      // Fallback to keyword matching
      const keywordMatch = this.findKeywordMatch(userQuery, faqs);
      if (keywordMatch) {
        return keywordMatch;
      }

      return null;
    } catch (error) {
      logger.error('Error in findBestMatch:', error);
      return null;
    }
  }

  private async findSemanticMatch(userQuery: string, faqs: FAQ[]): Promise<FAQMatch | null> {
    try {
      const faqQuestions = faqs.map(faq => faq.question);
      
      const prompt = `
You are a hotel FAQ matcher. Given a user query and a list of FAQ questions, find the best match.

User Query: "${userQuery}"

FAQ Questions:
${faqQuestions.map((q, i) => `${i}: ${q}`).join('\n')}

Respond with ONLY the number (index) of the best matching FAQ, or "NONE" if no good match exists.
A good match should have semantic similarity of at least 70%.
`;

      const response = await this.openai.generateResponse(prompt);
      const matchIndex = parseInt(response.trim());

      if (!isNaN(matchIndex) && matchIndex >= 0 && matchIndex < faqs.length) {
        return {
          faq: faqs[matchIndex],
          confidence: 0.8, // High confidence for semantic match
          matchType: 'semantic'
        };
      }

      return null;
    } catch (error) {
      logger.error('Error in semantic matching:', error);
      return null;
    }
  }

  private findKeywordMatch(userQuery: string, faqs: FAQ[]): FAQMatch | null {
    const queryLower = userQuery.toLowerCase();
    let bestMatch: FAQMatch | null = null;
    let bestScore = 0;

    for (const faq of faqs) {
      let score = 0;
      const totalKeywords = faq.keywords.length;

      // Check keyword matches
      for (const keyword of faq.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      // Check question similarity
      const questionWords = faq.question.toLowerCase().split(' ');
      const queryWords = queryLower.split(' ');
      
      for (const word of queryWords) {
        if (word.length > 3 && questionWords.includes(word)) {
          score += 0.5;
        }
      }

      const confidence = totalKeywords > 0 ? score / totalKeywords : score * 0.1;

      if (confidence > bestScore && confidence > 0.3) {
        bestMatch = {
          faq,
          confidence,
          matchType: 'keyword'
        };
        bestScore = confidence;
      }
    }

    return bestMatch;
  }

  async getAllFAQs(language: string = 'en'): Promise<FAQ[]> {
    try {
      const { data: faqs, error } = await this.supabase.client
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .eq('language', language)
        .order('category', { ascending: true });

      if (error) {
        logger.error('Error fetching all FAQs:', error);
        return [];
      }

      return faqs || [];
    } catch (error) {
      logger.error('Error in getAllFAQs:', error);
      return [];
    }
  }

  async getFAQsByCategory(category: string, language: string = 'en'): Promise<FAQ[]> {
    try {
      const { data: faqs, error } = await this.supabase.client
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .eq('language', language)
        .eq('category', category);

      if (error) {
        logger.error('Error fetching FAQs by category:', error);
        return [];
      }

      return faqs || [];
    } catch (error) {
      logger.error('Error in getFAQsByCategory:', error);
      return [];
    }
  }
}
