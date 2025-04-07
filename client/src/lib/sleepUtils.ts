/**
 * Парсить рядок різних форматів часу і повертає кількість хвилин
 * Підтримувані формати:
 * - "5год. 9хв." (скорочений)
 * - "5 година 9 хвилин" (повний з відмінюванням)
 * - "5 годин 9 хвилин" (повний з відмінюванням)
 * - "5 години 9 хвилин" (повний з відмінюванням)
 */
export function parseSleepDuration(duration: string | number): number {
  try {
    // Обробка числового значення
    if (typeof duration === 'number') {
      return duration;
    }
    
    // Виведемо в консоль для налагодження
    console.log("Парсинг тривалості:", duration);
    
    // Перевірка на пусте значення
    if (!duration || typeof duration !== 'string') {
      return 0;
    }
    
    // Спробуємо розпізнати "5год. 9хв." формат (скорочений)
    let regex = /(\d+)\s*год\.\s*(\d+)\s*хв\./;
    let matches = duration.match(regex);
    
    if (matches && matches.length >= 3) {
      const hours = parseInt(matches[1], 10);
      const minutes = parseInt(matches[2], 10);
      return hours * 60 + minutes;
    }
    
    // Спробуємо розпізнати формат з повними словами "X година/годин/години Y хвилина/хвилин/хвилини"
    regex = /(\d+)\s+(година|годин|години)(?:\s+(\d+)\s+(хвилина|хвилин|хвилини))?/i;
    matches = duration.match(regex);
    
    if (matches) {
      const hours = parseInt(matches[1], 10);
      // Якщо є частина з хвилинами
      const minutes = matches[3] ? parseInt(matches[3], 10) : 0;
      return hours * 60 + minutes;
    }
    
    // Спробуємо розпізнати тільки години без хвилин
    regex = /(\d+)\s+(година|годин|години)/i;
    matches = duration.match(regex);
    
    if (matches) {
      const hours = parseInt(matches[1], 10);
      return hours * 60;
    }
    
    // Спробуємо розпізнати тільки хвилини без годин
    regex = /(\d+)\s+(хвилина|хвилин|хвилини)/i;
    matches = duration.match(regex);
    
    if (matches) {
      const minutes = parseInt(matches[1], 10);
      return minutes;
    }
    
    return 0;
  } catch (error) {
    console.error("Помилка при обробці тривалості сну:", error, "для рядка:", duration);
    return 0;
  }
}

/**
 * Обчислює час, що залишився до цільової тривалості сну
 */
export function calculateRemainingTime(currentSleepMinutes: number, requiredSleepMinutes: number): number {
  return Math.max(0, requiredSleepMinutes - currentSleepMinutes);
}

/**
 * Обчислює час, на який перевиконано норму сну
 */
export function calculateExcessTime(currentSleepMinutes: number, requiredSleepMinutes: number): number {
  return Math.max(0, currentSleepMinutes - requiredSleepMinutes);
}