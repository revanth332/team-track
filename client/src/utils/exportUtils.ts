import { WeeklyUpdateApi, WeeklyUpdateProjectInfo } from '../types';
import { getMondayFromWeek, getWeekLabel, getWeekString } from './dateUtils';

/**
 * Strips HTML tags and normalizes whitespace/newlines
 */
export function stripHtml(html: string): string {
  if (!html) return 'N/A';
  
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');

  if (typeof document !== 'undefined') {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = text;
    text = tmp.textContent || tmp.innerText || '';
  } else {
    text = text.replace(/<[^>]*>/g, '');
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  return lines.length > 0 ? lines.join('\n') : 'N/A';
}

/**
 * Computes the previous week string (YYYY-Www) given a week string
 */
export function getPreviousWeekString(currentWeekStr: string): string {
  if (!currentWeekStr) return '';
  const mondayStr = getMondayFromWeek(currentWeekStr);
  if (!mondayStr) return '';
  const monday = new Date(mondayStr);
  monday.setDate(monday.getDate() - 7);
  return getWeekString(monday);
}

/**
 * Formats a single week's updates into standard export text
 */
export function formatWeeklyUpdatesToText(updates: WeeklyUpdateApi[]): string {
  if (!updates || updates.length === 0) {
    return 'No updates available for this week.';
  }

  const blocks: string[] = [];

  updates.forEach(update => {
    const resourceName = update.name || update.username || 'N/A';
    const userRole = update.role || 'N/A';
    const occupancyText = update.occupancy !== undefined && update.occupancy !== null ? `${update.occupancy}%` : 'N/A';

    (update.projects || []).forEach(proj => {
      const projName = proj.project_name || 'N/A';
      const projRole = proj.role || userRole;
      const contributions = stripHtml(proj.task_description);
      const remarks = proj.remarks_risks_dependencies?.trim() || 'N/A';
      const accomplishments = proj.accomplishments_highlights?.trim() || 'N/A';
      const businessImpact = proj.business_impact?.trim() || 'N/A';

      const block = [
        `Resource Name: ${resourceName}`,
        `Project Name: ${projName}`,
        `Role: ${projRole}`,
        `Key Contributions/Work Done: ${contributions.includes('\n') ? '\n' + contributions : contributions}`,
        `Remarks/Risks/Dependencies: ${remarks.includes('\n') ? '\n' + remarks : remarks}`,
        `Accomplishments/Highlights: ${accomplishments.includes('\n') ? '\n' + accomplishments : accomplishments}`,
        `Bandwidth/Occupancy: ${occupancyText}`,
        `Business Impact: ${businessImpact.includes('\n') ? '\n' + businessImpact : businessImpact}`
      ].join('\n');

      blocks.push(block);
    });
  });

  return blocks.join('\n\n' + '='.repeat(60) + '\n\n');
}

/**
 * Combines two weeks' updates for users into one consolidated biweekly export text
 */
export function formatBiweeklyUpdatesToText(
  currentWeekUpdates: WeeklyUpdateApi[],
  previousWeekUpdates: WeeklyUpdateApi[],
  currentWeekLabel: string,
  previousWeekLabel: string
): string {
  const allUsernames = Array.from(
    new Set([
      ...currentWeekUpdates.map(u => u.username),
      ...previousWeekUpdates.map(u => u.username)
    ])
  );

  if (allUsernames.length === 0) {
    return 'No updates available for the selected biweekly period.';
  }

  const blocks: string[] = [];

  allUsernames.forEach(username => {
    const currUpdate = currentWeekUpdates.find(u => u.username === username);
    const prevUpdate = previousWeekUpdates.find(u => u.username === username);

    const resourceName = currUpdate?.name || prevUpdate?.name || username;
    const userRole = currUpdate?.role || prevUpdate?.role || 'N/A';
    const occupancy = currUpdate?.occupancy !== undefined ? currUpdate.occupancy : prevUpdate?.occupancy;
    const occupancyText = occupancy !== undefined && occupancy !== null ? `${occupancy}%` : 'N/A';

    // Find all distinct project names for this user across both weeks
    const currProjects = currUpdate?.projects || [];
    const prevProjects = prevUpdate?.projects || [];

    const allProjectNames = Array.from(
      new Set([
        ...currProjects.map(p => p.project_name),
        ...prevProjects.map(p => p.project_name)
      ])
    );

    allProjectNames.forEach(projName => {
      const currProj = currProjects.find(p => p.project_name === projName);
      const prevProj = prevProjects.find(p => p.project_name === projName);

      const projRole = currProj?.role || prevProj?.role || userRole;

      // Key Contributions
      let contributionsStr = 'N/A';
      const prevContrib = prevProj ? stripHtml(prevProj.task_description) : '';
      const currContrib = currProj ? stripHtml(currProj.task_description) : '';

      if (prevContrib && currContrib) {
        contributionsStr = `[Week ${previousWeekLabel}]\n${prevContrib}\n\n[Week ${currentWeekLabel}]\n${currContrib}`;
      } else if (currContrib) {
        contributionsStr = currContrib;
      } else if (prevContrib) {
        contributionsStr = prevContrib;
      }

      // Remarks / Risks / Dependencies
      const prevRemarks = prevProj?.remarks_risks_dependencies?.trim();
      const currRemarks = currProj?.remarks_risks_dependencies?.trim();
      let remarksStr = 'N/A';
      if (prevRemarks && currRemarks) {
        remarksStr = prevRemarks === currRemarks ? currRemarks : `[Week ${previousWeekLabel}]: ${prevRemarks}\n[Week ${currentWeekLabel}]: ${currRemarks}`;
      } else if (currRemarks) {
        remarksStr = currRemarks;
      } else if (prevRemarks) {
        remarksStr = prevRemarks;
      }

      // Accomplishments / Highlights
      const prevAcc = prevProj?.accomplishments_highlights?.trim();
      const currAcc = currProj?.accomplishments_highlights?.trim();
      let accomplishmentsStr = 'N/A';
      if (prevAcc && currAcc) {
        accomplishmentsStr = prevAcc === currAcc ? currAcc : `[Week ${previousWeekLabel}]: ${prevAcc}\n[Week ${currentWeekLabel}]: ${currAcc}`;
      } else if (currAcc) {
        accomplishmentsStr = currAcc;
      } else if (prevAcc) {
        accomplishmentsStr = prevAcc;
      }

      // Business Impact
      const prevImpact = prevProj?.business_impact?.trim();
      const currImpact = currProj?.business_impact?.trim();
      let impactStr = 'N/A';
      if (prevImpact && currImpact) {
        impactStr = prevImpact === currImpact ? currImpact : `[Week ${previousWeekLabel}]: ${prevImpact}\n[Week ${currentWeekLabel}]: ${currImpact}`;
      } else if (currImpact) {
        impactStr = currImpact;
      } else if (prevImpact) {
        impactStr = prevImpact;
      }

      const block = [
        `Resource Name: ${resourceName}`,
        `Project Name: ${projName}`,
        `Role: ${projRole}`,
        `Key Contributions/Work Done: ${contributionsStr.includes('\n') ? '\n' + contributionsStr : contributionsStr}`,
        `Remarks/Risks/Dependencies: ${remarksStr.includes('\n') ? '\n' + remarksStr : remarksStr}`,
        `Accomplishments/Highlights: ${accomplishmentsStr.includes('\n') ? '\n' + accomplishmentsStr : accomplishmentsStr}`,
        `Bandwidth/Occupancy: ${occupancyText}`,
        `Business Impact: ${impactStr.includes('\n') ? '\n' + impactStr : impactStr}`
      ].join('\n');

      blocks.push(block);
    });
  });

  return blocks.join('\n\n' + '='.repeat(60) + '\n\n');
}