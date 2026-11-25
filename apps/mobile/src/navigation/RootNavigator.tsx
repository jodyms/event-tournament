import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fonts } from '../design-system/theme';
import { LoginScreen } from '../features/auth/LoginScreen';
import { CoachDashboardScreen } from '../features/coach/CoachDashboardScreen';
import { ManageTeamScreen } from '../features/coach/ManageTeamScreen';
import { CompetitionScreen } from '../features/competition/CompetitionScreen';
import { GroupScreen } from '../features/competition/GroupScreen';
import { ScheduleScreen } from '../features/competition/ScheduleScreen';
import { ContentScreen } from '../features/content/ContentScreen';
import { FavoritesScreen } from '../features/favorites/FavoritesScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { MatchDetailScreen } from '../features/matches/MatchDetailScreen';
import { MenuScreen } from '../features/navigation/MenuScreen';
import { NewsScreen } from '../features/news/NewsScreen';
import { TeamDetailScreen } from '../features/teams/TeamDetailScreen';
import { useAppStore } from '../store/appStore';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const icons = { Home: 'home-outline', Schedule: 'calendar-outline', News: 'newspaper-outline' } as const;

function MainTabs() {
  return <Tabs.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarStyle: { backgroundColor: colors.nav, borderTopColor: colors.border, height: 72, paddingTop: 7 }, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.subtle, tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 }, tabBarIcon: ({ color, size, focused }) => { const icon = icons[route.name]; const activeIcon = icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap; return <Ionicons name={focused ? activeIcon : icon} size={size} color={color} />; } })}><Tabs.Screen name="Home" component={HomeScreen} /><Tabs.Screen name="Schedule" component={ScheduleScreen} /><Tabs.Screen name="News" component={NewsScreen} /></Tabs.Navigator>;
}

export function RootNavigator() {
  const session = useAppStore((state) => state.session);
  const canCoach = session?.user.roles.includes('COACH');
  return <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.canvas } }}>{session ? <><Stack.Screen name="MainTabs" component={MainTabs} /><Stack.Screen name="Menu" component={MenuScreen} options={{ presentation: 'modal' }} /><Stack.Screen name="Competition" component={CompetitionScreen} /><Stack.Screen name="Group" component={GroupScreen} /><Stack.Screen name="TeamDetail" component={TeamDetailScreen} /><Stack.Screen name="MatchDetail" component={MatchDetailScreen} /><Stack.Screen name="Favorites" component={FavoritesScreen} />{canCoach ? <><Stack.Screen name="CoachDashboard" component={CoachDashboardScreen} /><Stack.Screen name="ManageTeam" component={ManageTeamScreen} /></> : null}<Stack.Screen name="Content" component={ContentScreen} /></> : <Stack.Screen name="Login" component={LoginScreen} />}</Stack.Navigator>;
}
