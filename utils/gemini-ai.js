const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to fix product references in the response text
function fixProductReferences(text) {
  // Replace any non-numeric IDs in product references with a placeholder
  const improperIdRegex = /\[PRODUCT:\{"id":\s*([^0-9][^}]*)\s*\}\]/g;
  const fixedText = text.replace(improperIdRegex, '[منتج مذكور]');
  return fixedText;
}

// Function to strip HTML tags from text
function stripHtmlTags(text) {
  // If the text contains contact information, remove any HTML tags
  if (text.includes('هاتف:') || text.includes('بريد إلكتروني:') || text.includes('فيسبوك:')) {
    // Replace HTML tags with nothing
    return text.replace(/<\/?[^>]+(>|$)/g, "");
  }
  return text;
}

async function getGeminiResponse(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Fix any improper product references
    text = fixProductReferences(text);
    
    // Strip any HTML tags, especially in contact information
    text = stripHtmlTags(text);
    
    return text;
  } catch (error) {
    console.error("Error getting response from Gemini:", error);
    return "Sorry, I'm having trouble understanding you right now. Please try again later.";
  }
}

module.exports = { getGeminiResponse };
