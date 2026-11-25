import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Menu: undefined;
  Competition: undefined;
  Group: { age?: string; group?: string; stageId?: string; ageGroupId?: string } | undefined;
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
