
const numberWords: { [key: string]: number } = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

export const parseNumberFromString = (str: string): number | null => {
  if (!str) return null;
  const trimmedStr = str.trim();

  // Try parsing a digit first, which handles cases like "3 seconds"
  const num = parseInt(trimmedStr, 10);
  if (!isNaN(num)) {
    return num;
  }

  // Try matching a number word at the beginning of the string
  const lowerStr = trimmedStr.toLowerCase();
  for (const word in numberWords) {
    if (lowerStr.startsWith(word)) {
      return numberWords[word];
    }
  }

  // Try to extract number from strings like "three seconds"
  const words = lowerStr.split(' ');
  for (const word of words) {
    if (numberWords[word]) {
      return numberWords[word];
    }
    const parsed = parseInt(word, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
};
