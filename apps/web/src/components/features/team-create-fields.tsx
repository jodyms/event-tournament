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

export function TeamCreateFields({ tournaments, initialTournamentId, initialAgeGroupId = '', initialStageId = '', initialName = '', structureLocked = false }: { tournaments: TeamTournamentOption[]; initialTournamentId?: string; initialAgeGroupId?: string; initialStageId?: string; initialName?: string; structureLocked?: boolean }) {
  const first = tournaments.find((row) => row.id === initialTournamentId)?.id ?? tournaments[0]?.id ?? '';
  const [tournamentId, setTournamentId] = useState(first);
  const [ageGroupId, setAgeGroupId] = useState(initialAgeGroupId);
  const [stageId, setStageId] = useState(initialStageId);
  const tournament = tournaments.find((row) => row.id === tournamentId) ?? tournaments[0];
  const ages = tournament?.groups ?? [];
  const age = ages.find((row) => row.id === ageGroupId) ?? ages[0];
  const stages = age?.stages ?? [];
  const stage = stages.find((row) => row.id === stageId);
  return <>
    <label>Club name<input name="name" required defaultValue={initialName} /></label>
    {structureLocked && <p className="split-note">This club is already on a match. Tournament, age category, and group stay as they are. Name and logo can still change.</p>}
    {structureLocked && <><input name="tournamentId" type="hidden" value={tournament?.id ?? ''} /><input name="ageGroupId" type="hidden" value={age?.id ?? ''} /><input name="stageId" type="hidden" value={stage?.id ?? ''} /></>}
    <label>Tournament<select name={structureLocked ? undefined : 'tournamentId'} disabled={structureLocked} value={tournament?.id ?? ''} onChange={(event) => { setTournamentId(event.target.value); setAgeGroupId(''); setStageId(''); }}>{tournaments.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.status}</option>)}</select></label>
    {tournament?.status === 'Draft' && <p className="split-note">This tournament is still a draft. The mobile app shows the club after you set the tournament to On Going.</p>}
    {tournament && <p className="split-note">Sport: {tournament.sport}</p>}
    {age ? <>
      <label>Age category<select name={structureLocked ? undefined : 'ageGroupId'} disabled={structureLocked} required={!structureLocked} value={age.id} onChange={(event) => { setAgeGroupId(event.target.value); setStageId(''); }}>{ages.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>Group<select name={structureLocked ? undefined : 'stageId'} disabled={structureLocked} value={stage?.id ?? ''} onChange={(event) => setStageId(event.target.value)}><option value="">No group yet</option>{stages.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    </> : tournament && <p className="split-note">This tournament has no age category yet. <Link href={tournament.setupHref}>Add an age category</Link>. It can stay {tournament.status}.</p>}
  </>;
}
