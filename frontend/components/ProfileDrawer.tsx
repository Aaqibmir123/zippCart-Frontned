import { AppLoader } from './AppLoader';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeleteAccountDialog } from './account/DeleteAccountDialog';
import { useAuth } from '../context/AuthContext';
import { useLogout } from '../services/auth/auth-mutations';
import { clearPendingLogout, clearSessionMayExist, setPendingLogout } from '../services/auth/session-storage';
import { AccountDrawerHeader } from './account/AccountDrawerHeader';
import { AccountMenuRow, AccountPage, MenuLabel } from './account/AccountMenuRow';
import { AccountPanel } from './account/AccountPanel';
import { AccountModeSwitch } from './account/AccountModeSwitch';
import { StoreRegistrationScreen } from '../features/user/store-registration';
import { AdminStoresScreen } from '../features/admin/stores';
import { ReturnSupportHub } from '../features/returns/ReturnSupportHub';
import { useReturnInbox } from '../features/returns/return-api';
import { useAppTheme } from '../theme/ThemeProvider';

type Props = { onClose: () => void; onOpenFavorites: () => void; visible: boolean };
const menu: MenuLabel[] = ['Profile', 'Favorites', 'Coupons', 'Referral', 'Your store'];
export function ProfileDrawer({ onClose, onOpenFavorites, visible }: Props) {
  const { setUser, user } = useAuth();
  const theme = useAppTheme();
  const logout = useLogout();
  const inbox = useReturnInbox('all', visible);
  const hasUpdates = inbox.data?.pages.some((batch) => batch.cases.some((item) => item.unread));
  const [page, setPage] = useState<AccountPage | null>(null);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const supportBack = useRef<(() => void) | null>(null);
  useEffect(() => { setPage(null); }, [user?.id]);
  useEffect(() => { if (!visible) setPage(null); }, [visible]);
  async function handleLogout() {
    let serverConfirmed = true;
    let localSignoutSaved = true;
    try { await setPendingLogout(); }
    catch {
      localSignoutSaved = false;
      console.warn('[auth] logout_marker_write_error');
    }
    try {
      await logout.mutateAsync();
      try { await clearPendingLogout(); }
      catch { console.warn('[auth] logout_marker_clear_error'); }
    }
    catch {
      serverConfirmed = false;
      console.warn('[auth] session_logout_server_error');
    } finally {
      setUser(null);
      onClose();
    }
    if (!serverConfirmed) {
      const detail = localSignoutSaved
        ? 'We could not confirm sign-out with the server. Please reconnect before signing in again.'
        : 'We could not confirm sign-out or save it on this device. Please reconnect and try again.';
      Alert.alert('Signed out on this device', detail);
    }
  }
  async function handleThemeToggle() {
    try { await theme.toggleTheme(); }
    catch { Alert.alert('Could not save appearance', 'Please try changing the theme again.'); }
  }
  async function handleAccountDeleted() {
    try { await setPendingLogout(); }
    catch { console.warn('[auth] logout_marker_write_error'); }
    try { await clearSessionMayExist(); }
    catch { console.warn('[auth] session_marker_clear_error'); }
    setDeleteAccountVisible(false);
    setUser(null);
    onClose();
    Alert.alert('Account deleted', 'Your account and personal data have been deleted.');
  }
  function requestClose() {
    if (page === 'Support' && supportBack.current) { supportBack.current(); return; }
    if (page === 'Your store') {
      Alert.alert('Leave store registration?', 'The details entered here will be cleared when you leave.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => setPage(null) },
      ]);
    } else if (page) setPage(null);
    else onClose();
  }
  return <>
  <Modal animationType="fade" onRequestClose={requestClose} transparent visible={visible}>
    <View style={[s.backdrop, { backgroundColor: theme.isDark ? '#000000AA' : '#20132E70' }]}>
      <Pressable accessibilityLabel="Close account menu" onPress={page === 'Your store' ? requestClose : onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['top', 'bottom', 'right']} style={[s.drawer, { backgroundColor: theme.colors.background }, (page === 'Your store' || page === 'Store requests' || page === 'Support') && s.storePage]}>
        {page === 'Support' ? <ReturnSupportHub onClose={() => setPage(null)} onBackChange={(handler) => { supportBack.current = handler; }} /> : page === 'Store requests' ? <AdminStoresScreen onClose={() => setPage(null)} /> : page === 'Your store' ? <StoreRegistrationScreen onClose={() => setPage(null)} /> : <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
            <AccountDrawerHeader title={page ?? 'My account'} isPage={!!page}
              name={user?.fullName} phone={user?.phone} image={user?.profileImage}
              onClose={() => page ? setPage(null) : onClose()} onProfile={() => setPage('Profile')} />
            {page ? <AccountPanel key={page} page={page} onSave={() => setPage(null)} /> : <>
              {visible && <AccountModeSwitch />}
              {user?.roles?.includes('admin') && <View style={[s.menu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><AccountMenuRow dark={theme.isDark} label="Store requests" onPress={() => setPage('Store requests')} /></View>}
              <View style={[s.menu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{menu.map((label) => <AccountMenuRow dark={theme.isDark} key={label} label={label} onPress={() => label === 'Favorites' ? onOpenFavorites() : setPage(label)} />)}</View>
              <View style={[s.helpMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <AccountMenuRow dark={theme.isDark} label="Support" unread={hasUpdates} onPress={() => setPage('Support')} />
                <View style={[s.divider, { backgroundColor: theme.colors.border }]} />
                <AccountMenuRow dark={theme.isDark} label="App info" onPress={() => setPage('App info')} />
              </View>
              <View style={[s.themeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={s.themeCopy}><Text style={[s.themeTitle, { color: theme.colors.text }]}>Dark mode</Text><Text style={[s.themeHint, { color: theme.colors.muted }]}>Use a darker appearance</Text></View>
                <Switch accessibilityLabel="Dark mode" value={theme.isDark} onValueChange={() => void handleThemeToggle()}
                  trackColor={{ false: '#D8D0E1', true: '#8861B5' }} thumbColor={theme.isDark ? '#E9D8FF' : '#FFFFFF'} />
              </View>
              {!user?.roles?.includes('admin') && <Pressable accessibilityRole="button" onPress={() => setDeleteAccountVisible(true)}
                style={({ pressed }) => [s.deleteCard, { backgroundColor: theme.isDark ? '#302429' : '#FFF7F6', borderColor: theme.isDark ? '#583841' : '#F2D9D7' }, pressed && s.deletePressed]}>
                <View style={s.deleteIcon}><Text style={s.deleteIconText}>×</Text></View>
                <View style={s.deleteCopy}>
                  <Text style={[s.deleteTitle, { color: theme.isDark ? '#FFD7D5' : '#9E2937' }]}>Delete account</Text>
                  <Text style={[s.deleteHint, { color: theme.isDark ? '#C8AEB2' : '#80666A' }]}>Permanently remove your account and personal data</Text>
                </View>
                <Text style={s.deleteArrow}>›</Text>
              </Pressable>}
              <View style={s.footer}><Pressable accessibilityRole="button" disabled={logout.isPending} onPress={() => void handleLogout()} style={[s.logout, theme.isDark && s.darkLogout]}>{logout.isPending ? <AppLoader color="#B65D73" /> : <Text style={s.logoutText}>Log out</Text>}</Pressable></View>
            </>}
          </ScrollView>
        </KeyboardAvoidingView>}
      </SafeAreaView>
    </View>
  </Modal>
  <DeleteAccountDialog visible={deleteAccountVisible} phone={user?.phone ?? ''}
    onClose={() => setDeleteAccountVisible(false)} onDeleted={() => void handleAccountDeleted()} />
  </>;
}
const s = StyleSheet.create({
  storePage: { width: '100%', maxWidth: 600, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  helpMenu: { marginHorizontal: 16, marginBottom: 10, padding: 4, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EEE7F3', borderRadius: 20 },
  themeRow: { marginHorizontal: 16, marginTop: 8, padding: 14, minHeight: 70, flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, borderWidth: 1 },
  themeCopy: { flex: 1, gap: 4 },
  themeTitle: { fontSize: 14, fontWeight: '700' },
  themeHint: { fontSize: 11 },
  deleteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 8,
    padding: 14, minHeight: 76, borderRadius: 18, borderWidth: 1 },
  deletePressed: { opacity: 0.78 },
  deleteIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#FCEBED' },
  deleteIconText: { color: '#B42332', fontSize: 26, fontWeight: '500', lineHeight: 28 },
  deleteCopy: { flex: 1, gap: 4 },
  deleteTitle: { fontSize: 14, fontWeight: '800' },
  deleteHint: { fontSize: 11, lineHeight: 16 },
  deleteArrow: { color: '#B42332', fontSize: 24 },
  divider: { height: 1, backgroundColor: '#F2EDF6', marginLeft: 68, marginRight: 16 },
  backdrop: { backgroundColor: '#20132E70', flex: 1 },
  drawer: { alignSelf: 'flex-end', backgroundColor: '#FAF8FC', width: '90%', maxWidth: 400,
    height: '100%', borderTopLeftRadius: 28, borderBottomLeftRadius: 28, overflow: 'hidden' },
  flex: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 8 },
  menu: { margin: 16, padding: 4, backgroundColor: '#FFFFFF', borderColor: '#EEE7F3', borderWidth: 1, borderRadius: 20 },
  footer: { flex: 1, justifyContent: 'flex-end', padding: 18, paddingTop: 10 },
  logout: { minHeight: 48, padding: 10, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FCECF2' },
  logoutText: { color: '#A43E65', fontSize: 13, fontWeight: '700' },
  darkLogout: { backgroundColor: '#392333' },
});
