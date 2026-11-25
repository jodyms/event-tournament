import { presentNews, presentStatus, presentTeam } from '../map';

describe('presentStatus', () => {
  it('maps API statuses onto the mobile match status', () => {
    expect(presentStatus('SCHEDULED')).toBe('UPCOMING');
    expect(presentStatus('FINISHED')).toBe('COMPLETED');
    expect(presentStatus('LIVE')).toBe('LIVE');
    expect(presentStatus('POSTPONED')).toBe('POSTPONED');
    expect(presentStatus('CANCELLED')).toBe('CANCELLED');
  });
});

describe('presentTeam', () => {
  it('derives display fields from the team name', () => {
    const team = presentTeam({ id: 'team-1', name: 'Kickball FC', ageGroupName: 'U12', stageName: 'Grup A', crestUrl: null, homeJersey: '#3EBF5F', awayJersey: '#FFFFFF' });
    expect(team.shortName).toBe('Kickball');
    expect(team.initials).toBe('KF');
    expect(team.age).toBe('U12');
    expect(team.group).toBe('Grup A');
  });
});

describe('presentNews', () => {
  it('estimates read time from the article body', () => {
    const article = presentNews({ id: 'n1', category: 'Berita', title: 'Judul', body: Array.from({ length: 400 }, () => 'kata').join(' '), coverUrl: null, publishedAt: null });
    expect(article.readMinutes).toBe(2);
    expect(article.body).toContain('kata');
  });
});
