import { describe, expect, it } from 'vitest';
import { cleanHtml, matchLabel, pageWindow, parseClockMinutes, scoresFromGoals, slugify, tournamentLabel } from '@/lib/domain/tournament-status';

const start = new Date('2026-06-15T00:00:00Z');
const end = new Date('2026-07-20T23:59:59Z');

describe('tournament display status', () => {
  it('maps stored status and dates onto the Figma labels', () => {
    expect(tournamentLabel('DRAFT', start, end, new Date('2026-06-20Z')).label).toBe('Draft');
    expect(tournamentLabel('CANCELLED', start, end, new Date('2026-06-20Z')).label).toBe('Canceled');
    expect(tournamentLabel('PUBLISHED', start, end, new Date('2026-06-20Z')).label).toBe('On Going');
    expect(tournamentLabel('PUBLISHED', start, end, new Date('2026-08-01Z')).label).toBe('Finished');
    expect(tournamentLabel('PUBLISHED', start, end, new Date('2026-05-01Z')).label).toBe('Scheduled');
    expect(tournamentLabel('ARCHIVED', start, end, new Date('2026-06-20Z')).label).toBe('Finished');
  });
  it('labels match rows the way the manage-match table does', () => {
    expect(matchLabel('SCHEDULED').label).toBe('Schedule');
    expect(matchLabel('POSTPONED').label).toBe('Postponed');
  });
  it('turns a clock value into minutes and counts goals per team', () => {
    expect(parseClockMinutes('01:30', 60)).toBe(90);
    expect(parseClockMinutes('', 60)).toBe(60);
    expect(scoresFromGoals('home', 'away', [{ teamId: 'home' }, { teamId: 'home' }, { teamId: 'away' }])).toEqual({ homeScore: 2, awayScore: 1 });
  });
  it('builds a slug, strips unsafe html, and clamps the page window', () => {
    expect(slugify('Summer Youth Cup!')).toBe('summer-youth-cup');
    expect(cleanHtml('<p onclick="alert(1)">Hi</p><script>bad()</script>')).toBe('<p>Hi</p>');
    expect(pageWindow('3', 10)).toMatchObject({ page: 2, start: 7, end: 10, pages: 2 });
  });
});
