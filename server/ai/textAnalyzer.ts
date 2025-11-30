export interface AnalysisResult {
  type: string;
  result: number | string | string[] | number[] | Record<string, unknown>;
  fromDataset?: boolean;
}

export interface DatasetStore {
  content: string;
  lines: string[];
  words: string[];
  timestamp: number;
}

const datasetStorage: Map<string, DatasetStore> = new Map();

export function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

export function countWords(text: string): number {
  return tokenizeWords(text).length;
}

export function countLines(text: string): number {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  return lines.length;
}

export function countCharacters(text: string, includeSpaces: boolean = true): number {
  if (includeSpaces) {
    return text.length;
  }
  return text.replace(/\s/g, '').length;
}

export function countSpecificWord(text: string, targetWord: string): number {
  const words = tokenizeWords(text);
  const target = targetWord.toLowerCase();
  return words.filter(word => word === target).length;
}

export function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d+\.?\d*/g);
  if (!matches) return [];
  return matches.map(Number).filter(n => !isNaN(n));
}

export function sumNumbers(numbers: number[]): number {
  return numbers.reduce((acc, num) => acc + num, 0);
}

export function findMax(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

export function findMin(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  return Math.min(...numbers);
}

export function calculateAverage(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  return sumNumbers(numbers) / numbers.length;
}

export function findRepeatedWords(text: string): string[] {
  const words = tokenizeWords(text);
  const wordCount: Record<string, number> = {};
  
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .filter(([_, count]) => count > 1)
    .map(([word]) => word);
}

export function findUniqueWords(text: string): string[] {
  const words = tokenizeWords(text);
  return Array.from(new Set(words));
}

export function countUniqueWords(text: string): number {
  return findUniqueWords(text).length;
}

export function getWordFrequency(text: string): Record<string, number> {
  const words = tokenizeWords(text);
  const frequency: Record<string, number> = {};
  
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return frequency;
}

export function countVowels(text: string): number {
  const vowels = text.toLowerCase().match(/[aeiouाआइईउऊएऐओऔ]/g);
  return vowels ? vowels.length : 0;
}

export function countConsonants(text: string): number {
  const consonants = text.toLowerCase().match(/[bcdfghjklmnpqrstvwxyzकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह]/g);
  return consonants ? consonants.length : 0;
}

export function storeDataset(sessionId: string, content: string): void {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const words = tokenizeWords(content);
  
  datasetStorage.set(sessionId, {
    content,
    lines,
    words,
    timestamp: Date.now(),
  });
}

export function getDataset(sessionId: string): DatasetStore | undefined {
  return datasetStorage.get(sessionId);
}

export function clearDataset(sessionId: string): void {
  datasetStorage.delete(sessionId);
}

export function hasDataset(sessionId: string): boolean {
  return datasetStorage.has(sessionId);
}

export interface LogicQueryPatterns {
  wordCount: RegExp[];
  lineCount: RegExp[];
  charCount: RegExp[];
  specificWordCount: RegExp[];
  numberExtract: RegExp[];
  sum: RegExp[];
  max: RegExp[];
  min: RegExp[];
  average: RegExp[];
  repeatedWords: RegExp[];
  uniqueWords: RegExp[];
  wordFrequency: RegExp[];
  vowelCount: RegExp[];
  consonantCount: RegExp[];
  datasetStore: RegExp[];
  datasetQuery: RegExp[];
  mathExpression: RegExp[];
}

const MULTIPLICATION_TABLE_PATTERNS = [
  /(\d+)\s*ka\s*table/i,
  /(\d+)\s*ki\s*table/i,
  /table\s+of\s+(\d+)/i,
  /(\d+)\s*का\s*टेबल/i,
  /multiplication\s+table\s+of\s+(\d+)/i,
  /(\d+)\s*table\s*likho/i,
  /(\d+)\s*ka\s*pahada/i,
  /write\s+(\d+)\s*table/i,
];

export function isMultiplicationTableQuery(query: string): { isMatch: boolean; number: number | null } {
  const normalizedQuery = query.toLowerCase().trim();
  
  for (const pattern of MULTIPLICATION_TABLE_PATTERNS) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (!isNaN(num) && num >= 1 && num <= 100) {
        return { isMatch: true, number: num };
      }
    }
  }
  
  return { isMatch: false, number: null };
}

export function generateMultiplicationTable(num: number, upTo: number = 10): string {
  const lines: string[] = [];
  for (let i = 1; i <= upTo; i++) {
    lines.push(`${num} x ${i} = ${num * i}`);
  }
  return lines.join('\n');
}

const PREVIOUS_MESSAGE_PATTERNS = [
  /maine\s+kitne\s+words?\s+(bheje|send\s+kiye|likhe)/i,
  /mane\s+kitne\s+words?\s+(bheje|send\s+kiye|likhe)/i,
  /pichle?\s+message\s+m(e|ein)?\s+kitne\s+words?/i,
  /upar\s+kitne\s+words?/i,
  /count\s+(karo|kar)\s+kitne\s+words?/i,
  /kitne\s+words?\s+send\s+kiye/i,
  /kitne\s+words?\s+(the|bheje|likhe)/i,
  /how\s+many\s+words?\s+(did\s+i|i)\s+(send|type|write)/i,
  /count\s+my\s+(previous|last)\s+(message|text)/i,
  /words?\s+in\s+my\s+(previous|last)\s+message/i,
];

export function isPreviousMessageQuery(query: string): boolean {
  const normalizedQuery = query.toLowerCase().trim();
  return PREVIOUS_MESSAGE_PATTERNS.some(p => p.test(normalizedQuery));
}

const LOGIC_PATTERNS: LogicQueryPatterns = {
  wordCount: [
    /^count\s+words?\s*[:.]?\s*/i,
    /^words?\s+count\s*[:.]?\s*/i,
    /kitne\s+words?\s*(hai|hain|h)?/i,
    /total\s+words?\s*[:.]?\s*/i,
    /word\s+count\s*[:.]?\s*/i,
    /कितने\s+शब्द/i,
    /words?\s+count\s+karo/i,
    /words?\s+gino/i,
    /count\s+the\s+words?\s*[:.]?\s*/i,
    /how\s+many\s+words?\s*[:.]?\s*/i,
  ],
  lineCount: [
    /^count\s+lines?\s*[:.]?\s*/i,
    /^lines?\s+count\s*[:.]?\s*/i,
    /kitni\s+lines?\s*(hai|hain|h)?/i,
    /total\s+lines?\s*[:.]?\s*/i,
    /line\s+count\s*[:.]?\s*/i,
    /कितनी\s+लाइन/i,
    /lines?\s+count\s+karo/i,
    /lines?\s+gino/i,
    /count\s+the\s+lines?\s*[:.]?\s*/i,
    /how\s+many\s+lines?\s*[:.]?\s*/i,
  ],
  charCount: [
    /^count\s+characters?\s*[:.]?\s*/i,
    /^characters?\s+count\s*[:.]?\s*/i,
    /kitne\s+characters?\s*(hai|hain|h)?/i,
    /character\s+count\s*[:.]?\s*/i,
    /कितने\s+अक्षर/i,
    /characters?\s+gino/i,
    /how\s+many\s+characters?\s*[:.]?\s*/i,
  ],
  specificWordCount: [
    /['"]([^'"]+)['"]\s+kitni\s+baar/i,
    /kitni\s+baar\s+['"]([^'"]+)['"]/i,
    /count\s+['"]([^'"]+)['"]/i,
    /['"]([^'"]+)['"]\s+kitne\s+baar/i,
    /['"]([^'"]+)['"]\s+कितनी\s+बार/i,
    /how\s+many\s+times?\s+['"]([^'"]+)['"]/i,
    /['"]([^'"]+)['"]\s+how\s+many/i,
  ],
  numberExtract: [
    /numbers?\s+(list\s+karo|dikhao|batao|nikalo)/i,
    /list\s+(all\s+)?numbers?/i,
    /extract\s+numbers?/i,
    /नंबर\s+(निकालो|बताओ|दिखाओ)/i,
    /kitne\s+numbers?\s+(hai|hain)/i,
    /numbers?\s+kitne/i,
  ],
  sum: [
    /sum\s+(karo|nikalo|batao)/i,
    /total\s+(karo|nikalo|batao)/i,
    /add\s+(karo|all)/i,
    /जोड़\s+(करो|निकालो)/i,
    /numbers?\s+ka\s+sum/i,
    /calculate\s+sum/i,
  ],
  max: [
    /sabse\s+bada/i,
    /(highest|maximum|max|largest)\s+(number|value)?/i,
    /सबसे\s+बड़ा/i,
    /maximum\s+(kya|hai|batao)/i,
  ],
  min: [
    /sabse\s+chota/i,
    /(lowest|minimum|min|smallest)\s+(number|value)?/i,
    /सबसे\s+छोटा/i,
    /minimum\s+(kya|hai|batao)/i,
  ],
  average: [
    /average\s+(karo|nikalo|batao)/i,
    /औसत\s+(निकालो|बताओ)/i,
    /mean\s+(value|nikalo)/i,
    /avg\s+(kya|hai)/i,
  ],
  repeatedWords: [
    /repeated\s+words?/i,
    /doosre\s+words?/i,
    /कौन\s+से\s+words?\s+repeat/i,
    /kitne\s+words?\s+repeat/i,
    /duplicate\s+words?/i,
    /words?\s+jo\s+repeat/i,
  ],
  uniqueWords: [
    /unique\s+words?/i,
    /alag\s+alag\s+words?/i,
    /different\s+words?/i,
    /अलग\s+शब्द/i,
    /kitne\s+unique/i,
  ],
  wordFrequency: [
    /word\s+frequency/i,
    /har\s+word\s+kitni\s+baar/i,
    /frequency\s+(list|table|dikhao)/i,
    /शब्द\s+आवृत्ति/i,
  ],
  vowelCount: [
    /kitne\s+vowels?/i,
    /vowel\s+count/i,
    /स्वर\s+कितने/i,
  ],
  consonantCount: [
    /kitne\s+consonants?/i,
    /consonant\s+count/i,
    /व्यंजन\s+कितने/i,
  ],
  datasetStore: [
    /^dataset:\s*/i,
    /yeh\s+dataset\s+hai/i,
    /save\s+(this\s+)?dataset/i,
    /store\s+(this\s+)?dataset/i,
    /dataset\s+save\s+karo/i,
  ],
  datasetQuery: [
    /dataset\s+me\s+/i,
    /dataset\s+में\s+/i,
    /from\s+dataset/i,
    /in\s+dataset/i,
  ],
  mathExpression: [
    /^\s*\d+\s*[\+\-\*\/x×÷]\s*\d+\s*[=\?]*\s*$/i,
    /^\s*what\s+is\s+\d+\s*[\+\-\*\/x×÷]\s*\d+/i,
    /^\s*calculate\s+\d+\s*[\+\-\*\/x×÷]\s*\d+/i,
    /^\s*\d+\s*(plus|minus|times|divided\s+by)\s*\d+/i,
    /^\s*\d+\s*(aur|plus|jama|guna|bhag)\s*\d+/i,
  ],
};

export type LogicType = 
  | 'word_count'
  | 'line_count'
  | 'char_count'
  | 'specific_word_count'
  | 'number_extract'
  | 'number_count'
  | 'sum'
  | 'max'
  | 'min'
  | 'average'
  | 'repeated_words'
  | 'unique_words'
  | 'unique_word_count'
  | 'word_frequency'
  | 'vowel_count'
  | 'consonant_count'
  | 'dataset_store'
  | 'dataset_query'
  | 'math_expression'
  | 'none';

export function evaluateMathExpression(expr: string): number | null {
  const cleaned = expr
    .replace(/[=\?]/g, '')
    .replace(/x/gi, '*')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/plus/gi, '+')
    .replace(/minus/gi, '-')
    .replace(/times/gi, '*')
    .replace(/divided\s+by/gi, '/')
    .replace(/aur/gi, '+')
    .replace(/jama/gi, '+')
    .replace(/guna/gi, '*')
    .replace(/bhag/gi, '/')
    .replace(/\s+/g, '')
    .trim();
  
  const match = cleaned.match(/^(-?\d+\.?\d*)([\+\-\*\/])(-?\d+\.?\d*)$/);
  if (!match) return null;
  
  const num1 = parseFloat(match[1]);
  const operator = match[2];
  const num2 = parseFloat(match[3]);
  
  switch (operator) {
    case '+': return num1 + num2;
    case '-': return num1 - num2;
    case '*': return num1 * num2;
    case '/': return num2 !== 0 ? num1 / num2 : null;
    default: return null;
  }
}

export interface DetectedLogic {
  type: LogicType;
  targetWord?: string;
  isDatasetQuery: boolean;
  confidence: number;
}

export function detectLogicQuery(query: string): DetectedLogic {
  const normalizedQuery = query.toLowerCase().trim();
  
  const isDatasetQuery = LOGIC_PATTERNS.datasetQuery.some(p => p.test(normalizedQuery));
  
  if (LOGIC_PATTERNS.datasetStore.some(p => p.test(normalizedQuery))) {
    return { type: 'dataset_store', isDatasetQuery: false, confidence: 0.9 };
  }
  
  for (const pattern of LOGIC_PATTERNS.specificWordCount) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      return { 
        type: 'specific_word_count', 
        targetWord: match[1], 
        isDatasetQuery, 
        confidence: 0.95 
      };
    }
  }
  
  if (LOGIC_PATTERNS.sum.some(p => p.test(normalizedQuery))) {
    return { type: 'sum', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.max.some(p => p.test(normalizedQuery))) {
    return { type: 'max', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.min.some(p => p.test(normalizedQuery))) {
    return { type: 'min', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.average.some(p => p.test(normalizedQuery))) {
    return { type: 'average', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.repeatedWords.some(p => p.test(normalizedQuery))) {
    return { type: 'repeated_words', isDatasetQuery, confidence: 0.85 };
  }
  
  if (LOGIC_PATTERNS.uniqueWords.some(p => p.test(normalizedQuery))) {
    if (/kitne|count|how\s+many/i.test(normalizedQuery)) {
      return { type: 'unique_word_count', isDatasetQuery, confidence: 0.85 };
    }
    return { type: 'unique_words', isDatasetQuery, confidence: 0.85 };
  }
  
  if (LOGIC_PATTERNS.wordFrequency.some(p => p.test(normalizedQuery))) {
    return { type: 'word_frequency', isDatasetQuery, confidence: 0.85 };
  }
  
  if (LOGIC_PATTERNS.numberExtract.some(p => p.test(normalizedQuery))) {
    if (/kitne\s+numbers?|how\s+many\s+numbers?/i.test(normalizedQuery)) {
      return { type: 'number_count', isDatasetQuery, confidence: 0.9 };
    }
    return { type: 'number_extract', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.wordCount.some(p => p.test(normalizedQuery))) {
    return { type: 'word_count', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.lineCount.some(p => p.test(normalizedQuery))) {
    return { type: 'line_count', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.charCount.some(p => p.test(normalizedQuery))) {
    return { type: 'char_count', isDatasetQuery, confidence: 0.9 };
  }
  
  if (LOGIC_PATTERNS.vowelCount.some(p => p.test(normalizedQuery))) {
    return { type: 'vowel_count', isDatasetQuery, confidence: 0.85 };
  }
  
  if (LOGIC_PATTERNS.consonantCount.some(p => p.test(normalizedQuery))) {
    return { type: 'consonant_count', isDatasetQuery, confidence: 0.85 };
  }
  
  if (LOGIC_PATTERNS.mathExpression.some(p => p.test(query))) {
    return { type: 'math_expression', isDatasetQuery: false, confidence: 0.95 };
  }
  
  return { type: 'none', isDatasetQuery: false, confidence: 0 };
}

export interface ProcessLogicResult {
  isLogicQuery: boolean;
  result?: AnalysisResult;
  error?: string;
}

function extractDatasetContent(query: string): string {
  for (const pattern of LOGIC_PATTERNS.datasetStore) {
    if (pattern.test(query)) {
      const content = query.replace(pattern, '').trim();
      const lines = query.split('\n');
      if (lines.length > 1) {
        return lines.slice(1).join('\n').trim() || content;
      }
      return content;
    }
  }
  return '';
}

function stripCommandPhrase(query: string): string {
  let result = query;
  
  const allPatterns = [
    ...LOGIC_PATTERNS.wordCount,
    ...LOGIC_PATTERNS.lineCount,
    ...LOGIC_PATTERNS.charCount,
    ...LOGIC_PATTERNS.numberExtract,
    ...LOGIC_PATTERNS.sum,
    ...LOGIC_PATTERNS.max,
    ...LOGIC_PATTERNS.min,
    ...LOGIC_PATTERNS.average,
    ...LOGIC_PATTERNS.repeatedWords,
    ...LOGIC_PATTERNS.uniqueWords,
    ...LOGIC_PATTERNS.wordFrequency,
    ...LOGIC_PATTERNS.vowelCount,
    ...LOGIC_PATTERNS.consonantCount,
    ...LOGIC_PATTERNS.datasetQuery,
  ];
  
  for (const pattern of allPatterns) {
    result = result.replace(pattern, ' ');
  }
  
  return result.replace(/\s+/g, ' ').trim();
}

export function processLogicQuery(
  query: string, 
  sessionId: string,
  inputText?: string
): ProcessLogicResult {
  const detected = detectLogicQuery(query);
  
  if (detected.type === 'none') {
    return { isLogicQuery: false };
  }
  
  if (detected.type === 'dataset_store') {
    const datasetContent = extractDatasetContent(query);
    if (datasetContent.length > 0) {
      storeDataset(sessionId, datasetContent);
      return {
        isLogicQuery: true,
        result: {
          type: 'dataset_stored',
          result: JSON.stringify({
            message: 'Dataset saved successfully',
            words: countWords(datasetContent),
            lines: countLines(datasetContent)
          }),
        },
      };
    }
    return {
      isLogicQuery: true,
      error: 'Dataset content is empty. Please provide text after "dataset:"',
    };
  }
  
  if (detected.type === 'math_expression') {
    const mathResult = evaluateMathExpression(query);
    if (mathResult !== null) {
      return {
        isLogicQuery: true,
        result: {
          type: 'math_expression',
          result: mathResult,
        },
      };
    }
    return {
      isLogicQuery: true,
      error: 'Could not calculate the expression.',
    };
  }
  
  let textToAnalyze: string;
  
  if (detected.isDatasetQuery) {
    const dataset = getDataset(sessionId);
    if (!dataset) {
      return {
        isLogicQuery: true,
        error: 'Dataset available nahi hai. Pehle dataset save karo using "dataset: [your text]"',
      };
    }
    textToAnalyze = dataset.content;
  } else if (inputText && inputText.trim().length > 0) {
    textToAnalyze = inputText;
  } else {
    const queryWithoutCommand = stripCommandPhrase(query);
    
    if (queryWithoutCommand.length > 0) {
      textToAnalyze = queryWithoutCommand;
    } else {
      const errorMessages: Record<LogicType, string> = {
        'word_count': 'Please provide text to count words. Example: "count words: Hello world" or first save a dataset using "dataset: your text here"',
        'line_count': 'Please provide text to count lines. Example: "count lines: Line1\\nLine2" or first save a dataset.',
        'char_count': 'Please provide text to count characters. Example: "count characters: Hello"',
        'sum': 'Please provide numbers to sum. Example: "sum: 10 20 30"',
        'max': 'Please provide numbers to find maximum. Example: "max: 5 10 15"',
        'min': 'Please provide numbers to find minimum. Example: "min: 5 10 15"',
        'average': 'Please provide numbers to calculate average. Example: "average: 10 20 30"',
        'repeated_words': 'Please provide text to find repeated words.',
        'unique_words': 'Please provide text to find unique words.',
        'unique_word_count': 'Please provide text to count unique words.',
        'word_frequency': 'Please provide text to analyze word frequency.',
        'vowel_count': 'Please provide text to count vowels.',
        'consonant_count': 'Please provide text to count consonants.',
        'number_extract': 'Please provide text to extract numbers from.',
        'number_count': 'Please provide text to count numbers in.',
        'specific_word_count': 'Please provide text to search in.',
        'dataset_store': 'Please provide content for the dataset.',
        'dataset_query': 'No dataset available. First save a dataset using "dataset: your text here"',
        'math_expression': 'Please provide a valid math expression.',
        'none': 'Please provide text to analyze.',
      };
      return {
        isLogicQuery: true,
        error: errorMessages[detected.type] || 'Please provide text to analyze.',
      };
    }
  }
  
  let result: AnalysisResult;
  
  switch (detected.type) {
    case 'word_count':
      result = {
        type: 'word_count',
        result: countWords(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'line_count':
      result = {
        type: 'line_count',
        result: countLines(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'char_count':
      result = {
        type: 'char_count',
        result: countCharacters(textToAnalyze, false),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'specific_word_count':
      result = {
        type: 'specific_word_count',
        result: countSpecificWord(textToAnalyze, detected.targetWord || ''),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'number_extract':
      result = {
        type: 'number_extract',
        result: extractNumbers(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'number_count':
      result = {
        type: 'number_count',
        result: extractNumbers(textToAnalyze).length,
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'sum':
      const numsForSum = extractNumbers(textToAnalyze);
      result = {
        type: 'sum',
        result: sumNumbers(numsForSum),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'max':
      const numsForMax = extractNumbers(textToAnalyze);
      const maxVal = findMax(numsForMax);
      result = {
        type: 'max',
        result: maxVal !== null ? maxVal : 'No numbers found',
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'min':
      const numsForMin = extractNumbers(textToAnalyze);
      const minVal = findMin(numsForMin);
      result = {
        type: 'min',
        result: minVal !== null ? minVal : 'No numbers found',
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'average':
      const numsForAvg = extractNumbers(textToAnalyze);
      const avgVal = calculateAverage(numsForAvg);
      result = {
        type: 'average',
        result: avgVal !== null ? Math.round(avgVal * 100) / 100 : 'No numbers found',
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'repeated_words':
      result = {
        type: 'repeated_words',
        result: findRepeatedWords(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'unique_words':
      result = {
        type: 'unique_words',
        result: findUniqueWords(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'unique_word_count':
      result = {
        type: 'unique_word_count',
        result: countUniqueWords(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'word_frequency':
      result = {
        type: 'word_frequency',
        result: getWordFrequency(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'vowel_count':
      result = {
        type: 'vowel_count',
        result: countVowels(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    case 'consonant_count':
      result = {
        type: 'consonant_count',
        result: countConsonants(textToAnalyze),
        fromDataset: detected.isDatasetQuery,
      };
      break;
      
    default:
      return { isLogicQuery: false };
  }
  
  return {
    isLogicQuery: true,
    result,
  };
}

export function formatLogicResult(result: AnalysisResult): string {
  const numericTypes = [
    'word_count', 'line_count', 'char_count', 'specific_word_count',
    'number_count', 'unique_word_count', 'vowel_count', 'consonant_count',
    'sum', 'max', 'min', 'average', 'math_expression'
  ];
  
  const arrayTypes = ['number_extract', 'repeated_words', 'unique_words'];
  
  if (numericTypes.includes(result.type)) {
    const value = result.result;
    if (typeof value === 'number') {
      return result.fromDataset ? `${value} (from dataset)` : String(value);
    }
    return result.fromDataset ? `${value} (from dataset)` : String(value);
  }
  
  if (arrayTypes.includes(result.type)) {
    const arr = result.result as unknown[];
    if (arr.length === 0) {
      return '[]';
    }
    return JSON.stringify(arr);
  }
  
  if (result.type === 'word_frequency') {
    return JSON.stringify(result.result);
  }
  
  if (result.type === 'dataset_stored') {
    return result.result as string;
  }
  
  return String(result.result);
}
