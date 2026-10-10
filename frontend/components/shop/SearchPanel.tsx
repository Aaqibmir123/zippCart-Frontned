import { AppLoader } from '../AppLoader';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useScreenActive } from '../../hooks/useScreenActive';
import { SEARCH_MAX_LENGTH, useSearchTerm } from '../../features/search/useSearchTerm';
import { SearchResults } from '../../features/search/SearchResults';
import { searchStyles as s } from '../../features/search/search.styles';

type SearchPanelProps = { onClose: () => void; onOpenProduct: (id: string) => void; visible: boolean };

export function SearchPanel({ onClose, onOpenProduct, visible }: SearchPanelProps) {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const active = useScreenActive(visible);
  const term = useSearchTerm(query, active);
  return <Modal animationType="slide" onRequestClose={onClose} visible={active}>
    {active && <SafeAreaView edges={['top']} style={[s.page, { backgroundColor: theme.colors.background }]}>
      <View style={s.topRow}>
        <Pressable accessibilityRole="button" onPress={onClose} style={s.close}>
          <Text style={[s.closeText, { color: theme.colors.primary }]}>Close</Text>
        </Pressable>
        <Text style={[s.title, { color: theme.colors.text }]}>Search</Text><View style={s.space} />
      </View>
      <View style={[s.inputWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
        <TextInput autoFocus accessibilityLabel="Search products" maxLength={SEARCH_MAX_LENGTH}
          onChangeText={(value) => setQuery(value.slice(0, SEARCH_MAX_LENGTH))} placeholder="Search products"
          placeholderTextColor={theme.colors.muted} style={[s.input, { color: theme.colors.text }]} value={query} />
      </View>
      {term ? <SearchResults key={term} term={term} onOpenProduct={onOpenProduct} />
        : query.trim() ? <AppLoader accessibilityLabel="Searching products" color={theme.colors.primary} />
          : <Text style={[s.infoText, { color: theme.colors.muted }]}>Search products by name.</Text>}
    </SafeAreaView>}
  </Modal>;
}
