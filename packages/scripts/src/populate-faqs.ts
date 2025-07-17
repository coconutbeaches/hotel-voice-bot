import { readFileSync } from 'fs';
import path from 'path';

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from multiple possible locations
const possibleEnvPaths = [
  '../../../.env',
  '../../../.env.local',
  '../../../.env.development'
];

for (const envPath of possibleEnvPaths) {
  try {
    const fullPath = path.resolve(envPath);
    if (readFileSync(fullPath)) {
      config({ path: fullPath });
      console.log(`Loaded env from: ${fullPath}`);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  console.error('\nPlease create a .env file with these values.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sampleFAQs = [
  {
    question: "What time is check-in?",
    answer: "Check-in time is 3:00 PM. Early check-in may be available upon request and subject to availability.",
    category: "check-in",
    keywords: ["check-in", "arrival", "time", "early"]
  },
  {
    question: "What time is check-out?",
    answer: "Check-out time is 11:00 AM. Late check-out may be available for an additional fee.",
    category: "check-out",
    keywords: ["check-out", "departure", "time", "late"]
  },
  {
    question: "Do you have WiFi?",
    answer: "Yes, we offer complimentary high-speed WiFi throughout the hotel. The network name is 'Hotel-Guest' and no password is required.",
    category: "amenities",
    keywords: ["wifi", "internet", "network", "password"]
  },
  {
    question: "Is breakfast included?",
    answer: "Continental breakfast is included with all reservations. Breakfast is served from 6:30 AM to 10:00 AM in the main dining room.",
    category: "dining",
    keywords: ["breakfast", "included", "continental", "dining", "restaurant"]
  },
  {
    question: "Do you have parking?",
    answer: "Yes, we offer complimentary self-parking for all guests. Valet parking is available for $25 per night.",
    category: "parking",
    keywords: ["parking", "valet", "self-parking", "garage", "car"]
  },
  {
    question: "Is the pool open?",
    answer: "Our outdoor pool is open from 6:00 AM to 10:00 PM daily. The pool is heated and towels are provided.",
    category: "amenities",
    keywords: ["pool", "swimming", "heated", "towels", "hours"]
  },
  {
    question: "Do you have room service?",
    answer: "Yes, room service is available 24/7. You can order by calling extension 7777 or through the hotel app.",
    category: "dining",
    keywords: ["room service", "delivery", "24/7", "extension", "app"]
  },
  {
    question: "Where can I get ice?",
    answer: "Ice machines are located on each floor near the elevators. Ice is complimentary for all guests.",
    category: "amenities",
    keywords: ["ice", "machine", "floor", "elevator", "vending"]
  },
  {
    question: "How do I connect to WiFi?",
    answer: "Connect to the 'Hotel-Guest' network. No password is required. If you need assistance, please contact the front desk.",
    category: "amenities",
    keywords: ["wifi", "connect", "network", "guest", "front desk"]
  },
  {
    question: "What are your restaurant hours?",
    answer: "Our main restaurant is open from 6:30 AM to 10:00 PM daily. Room service is available 24/7.",
    category: "dining",
    keywords: ["restaurant", "hours", "dining", "room service", "kitchen"]
  },
  {
    question: "Do you have a fitness center?",
    answer: "Yes, our fitness center is open 24/7 and features modern equipment including cardio machines and free weights.",
    category: "amenities",
    keywords: ["fitness", "gym", "exercise", "24/7", "equipment"]
  },
  {
    question: "Can I get extra towels?",
    answer: "Yes, housekeeping can provide extra towels. Please call the front desk at extension 0 or request through the hotel app.",
    category: "housekeeping",
    keywords: ["towels", "extra", "housekeeping", "front desk", "extension"]
  },
  {
    question: "Is there a business center?",
    answer: "Yes, our business center is located on the lobby level and is open 24/7. It includes computers, printers, and office supplies.",
    category: "amenities",
    keywords: ["business center", "computer", "printer", "office", "lobby"]
  },
  {
    question: "Do you have laundry service?",
    answer: "Yes, we offer both dry cleaning and laundry service. Items collected by 10 AM are returned by 6 PM the same day.",
    category: "services",
    keywords: ["laundry", "dry cleaning", "service", "collection", "return"]
  },
  {
    question: "How do I adjust the thermostat?",
    answer: "The thermostat is located on the wall near the entrance. You can adjust the temperature and fan settings using the touch controls.",
    category: "room",
    keywords: ["thermostat", "temperature", "heat", "air conditioning", "controls"]
  },
  {
    question: "What is the hotel address?",
    answer: "Our hotel is located at 123 Main Street, Downtown, City, State 12345. We're just two blocks from the convention center.",
    category: "general",
    keywords: ["address", "location", "directions", "convention center", "downtown"]
  },
  {
    question: "Do you have a concierge?",
    answer: "Yes, our concierge is available from 7:00 AM to 9:00 PM daily to assist with reservations, directions, and local recommendations.",
    category: "services",
    keywords: ["concierge", "reservations", "directions", "recommendations", "local"]
  },
  {
    question: "Is there a safe in the room?",
    answer: "Yes, each room has a digital safe that can accommodate laptops and valuables. Instructions are provided on the safe door.",
    category: "room",
    keywords: ["safe", "security", "digital", "laptop", "valuables"]
  },
  {
    question: "Do you allow pets?",
    answer: "We are a pet-friendly hotel. Dogs up to 50 pounds are welcome for a $75 pet fee per stay. Please register your pet at check-in.",
    category: "policies",
    keywords: ["pets", "dogs", "pet-friendly", "fee", "register"]
  },
  {
    question: "How do I call the front desk?",
    answer: "Dial 0 from your room phone to reach the front desk. We're available 24/7 to assist you with any needs.",
    category: "general",
    keywords: ["front desk", "phone", "extension", "24/7", "assistance"]
  }
];

async function populateFAQs() {
  console.log('Populating FAQ table with sample data...');
  
  try {
    // Insert sample FAQs
    const { data, error } = await supabase
      .from('faqs')
      .insert(sampleFAQs)
      .select('id, question');
    
    if (error) {
      console.error('Error inserting FAQs:', error);
      return;
    }
    
    console.log(`Successfully inserted ${data?.length || 0} FAQs:`);
    data?.forEach(faq => {
      console.log(`- ID ${faq.id}: "${faq.question}"`);
    });
    
  } catch (error) {
    console.error('Error populating FAQs:', error);
  }
}

// Run the script
populateFAQs();
