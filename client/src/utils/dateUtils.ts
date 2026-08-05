/**
 * Gets the YYYY-Www string for a given date
 */
export function getWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Gets the Monday (YYYY-MM-DD) for a given YYYY-Www string
 */
export function getMondayFromWeek(weekString: string): string {
  if (!weekString) return '';
  const parts = weekString.split('-W');
  if (parts.length !== 2) return '';
  
  const year = parseInt(parts[0]);
  const week = parseInt(parts[1]);
  
  const d = new Date(year, 0, 4);
  const dayNum = d.getDay() || 7;
  const mondayOfFirstWeek = new Date(d.getTime());
  mondayOfFirstWeek.setDate(d.getDate() - (dayNum - 1));
  
  const targetMonday = new Date(mondayOfFirstWeek.getTime());
  targetMonday.setDate(mondayOfFirstWeek.getDate() + (week - 1) * 7);
  
  return targetMonday.toISOString().split('T')[0];
}

/**
 * Gets the Friday (YYYY-MM-DD) for a given YYYY-Www string
 */
export function getFridayFromWeek(weekString: string): string {
  const monday = getMondayFromWeek(weekString);
  if (!monday) return '';
  const d = new Date(monday);
  d.setDate(d.getDate() + 5); // Monday + 4 days = Friday
  return d.toISOString().split('T')[0];
}

/**
 * Generates week options for the last N weeks with custom labels
 */
export function generateWeekOptions(count: number = 12): { value: string, label: string }[] {
  const options = [];
  const today = new Date();

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (i * 7));
    const weekStr = getWeekString(d);
    
    // Calculate range for the label
    const mondayStr = getMondayFromWeek(weekStr);
    const monday = new Date(mondayStr);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const start = monday.toLocaleDateString('en-US', formatOptions);
    const end = sunday.toLocaleDateString('en-US', formatOptions);
    const label = `${start} – ${end}`;
    
    options.push({ value: weekStr, label });
  }
  
  return options;
}

/**
 * Gets a friendly label for a week string (YYYY-Www)
 */
export function getWeekLabel(weekStr: string): string {
  if (!weekStr) return '';
  
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const mondayStr = getMondayFromWeek(weekStr);
  const monday = new Date(mondayStr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toLocaleDateString('en-US', formatOptions);
  const end = sunday.toLocaleDateString('en-US', formatOptions);
  return `${start} – ${end}`;
}

/**
 * Gets the default week based on the "Friday" rule
 */
export function getDefaultWeek(): string {
  const today = new Date();
  const day = today.getDay(); // 0 (Sun) to 6 (Sat)
  const isSubmissionDays = day === 5 || day === 6 || day === 0;
  
  if (isSubmissionDays) {
    return getWeekString(today);
  } else {
    const lastWeekDate = new Date(today);
    lastWeekDate.setDate(today.getDate() - 7);
    return getWeekString(lastWeekDate);
  }
}

/**
 * Returns a friendly "time ago" string
 */
export function timeAgo(dateInput: string | Date | undefined): string {
  if (!dateInput) return 'Never';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
