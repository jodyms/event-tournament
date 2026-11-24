export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Menu: undefined;
  Competition: undefined;
  Group: { age?: string; group?: string; stageId?: string } | undefined;
  TeamDetail: { teamId: string };
  MatchDetail: { matchId: string };
  Favorites: undefined;
  CoachDashboard: undefined;
  ManageTeam: { teamId: string };
  Content: { kind: 'highlights' | 'rules' | 'pitch' | 'notifications' | 'certificate' };
};

export type MainTabParamList = {
  Home: undefined;
  Schedule: undefined;
  News: undefined;
};
