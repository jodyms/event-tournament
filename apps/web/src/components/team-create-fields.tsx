'use client';

import { useState } from 'react';
import Link from 'next/link';

export type TeamTournamentOption = {
  id: string;
  name: string;
  status: string;
  sport: string;
  setupHref: string;
  groups: { id: string; name: string; stages: { id: string; name: string }[] }[];
};

export function TeamCreateFields({ tournaments, initialTournamentId }: { tournaments: TeamTournamentOption[]; initialTournamentId?: string }) {
  const first = tournaments.find((row) => row.id === initialTournamentId)?.id ?? tournaments[0]?.id ?? '';
  const [tournamentId, setTournamentId] = useState(first);
  const [ageGroupId, setAgeGroupId] = useState('');
  const [stageId, setStageId] = useState('');
  const tournament = tournaments.find((row) => row.id === tournamentId) ?? tournaments[0];
  const ages = tournament?.groups ?? [];
  const age = ages.find((row) => row.id === ageGroupId) ?? ages[0];
  const stages = age?.stages ?? [];
  const stage = stages.find((row) => row.id === stageId);
  return <>
    <label>Club name<input name="name" required /></label>
    <label>Tournament<select name="tournamentId" value={tournament?.id ?? ''} onChange={(event) => { setTournamentId(event.target.value); setAgeGroupId(''); setStageId(''); }}>{tournaments.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.status}</option>)}</select></label>
    {tournament?.status === 'Draft' && <p className="split-note">This tournament is still a draft. You can add the team now. The mobile app shows it after you set the tournament to On Going.</p>}
    {tournament && <p className="split-note">Sport: {tournament.sport}</p>}
    {age ? <>
      <label>Age category<select name="ageGroupId" required value={age.id} onChange={(event) => { setAgeGroupId(event.target.value); setStageId(''); }}>{ages.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>Group<select name="stageId" value={stage?.id ?? ''} onChange={(event) => setStageId(event.target.value)}><option value="">No group yet</option>{stages.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    </> : tournament && <p className="split-note">This tournament has no age category yet. <Link href={tournament.setupHref}>Add an age category</Link>. It can stay {tournament.status}.</p>}
  </>;
}
