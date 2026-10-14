import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from '../services/query-client';
import { QueryLifecycle } from '../components/QueryLifecycle';
import { PendingLogoutRecovery } from '../components/PendingLogoutRecovery';

import { AuthProvider, useAuth } from "../context/AuthContext";
import { SessionLoader } from "../components/SessionLoader";
import { AuthNavigator } from "./AuthNavigator";
import { ShopNavigator } from "./user/ShopNavigator";
import { SellerModeScreen } from "../screens/seller/SellerModeScreen";
import { AdminNavigator } from './admin/AdminNavigator';
import { NotificationProvider } from '../features/notifications/NotificationProvider';
import { LoginWelcomeScreen } from '../features/auth/LoginWelcomeScreen';
import { ThemeProvider } from '../theme/ThemeProvider';

const queryClient = createQueryClient();

export function RootNavigator() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <QueryLifecycle />
        <AuthProvider>
          <PendingLogoutRecovery />
          <NotificationProvider><AppNavigator /></NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { isRestoringSession, sessionRestoreIssue, retrySessionRestore, user, isWelcomePending, dismissWelcome } = useAuth();
  if (isRestoringSession) return <SessionLoader />;
  if (!user && sessionRestoreIssue) return <SessionLoader onRetry={retrySessionRestore} />;
  const isApprovedSeller = user?.mode === 'seller' && user.storeStatus === 'approved'
    && user.isActive && user.roles?.includes('seller');
  const isAdmin = user?.roles?.includes('admin') ?? false;
  return (
    <NavigationContainer>
      {user ? (
        isWelcomePending && !isAdmin && !isApprovedSeller
          ? <ThemeProvider><LoginWelcomeScreen onContinue={dismissWelcome} /></ThemeProvider>
          : isAdmin ? <AdminNavigator key={user.id} /> : isApprovedSeller ? (
          <SellerModeScreen />
        ) : (
          <ShopNavigator key={user.id} />
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
