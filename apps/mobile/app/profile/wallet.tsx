import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/providers/AuthProvider';
import {
  fetchWallet,
  fetchWalletLedger,
} from '@/modules/escrow/api';
import { LoadingScreen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function WalletScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet', session?.user.id],
    queryFn: () => fetchWallet(session!.user.id),
    enabled: !!session?.user.id,
  });

  const { data: ledger = [], refetch: refetchLedger } = useQuery({
    queryKey: ['wallet-ledger', wallet?.id],
    queryFn: () => fetchWalletLedger(wallet!.id),
    enabled: !!wallet?.id,
  });


  if (isLoading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={styles.balanceValue}>
          {(wallet?.balance ?? 0).toLocaleString()} {wallet?.currency ?? 'UZS'}
        </Text>
        <Text style={styles.demoNote}>{t('wallet.demoNote')}</Text>
      </View>

      <View style={styles.paymentNotice}>
        <Text style={styles.paymentNoticeTitle}>{t('wallet.deposit')}</Text>
        <Text style={styles.paymentNoticeText}>{t('wallet.paymentSetupPending')}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('wallet.history')}</Text>
      <FlatList
        data={ledger}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('wallet.noHistory')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.ledgerItem}>
            <View style={styles.ledgerLeft}>
              <Text style={styles.ledgerDesc} numberOfLines={2}>
                {item.description ?? (item.amount >= 0 ? t('wallet.credit') : t('wallet.debit'))}
              </Text>
              <Text style={styles.ledgerDate}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            <Text style={[styles.ledgerAmount, item.amount >= 0 ? styles.credit : styles.debit]}>
              {item.amount >= 0 ? '+' : ''}
              {item.amount.toLocaleString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balanceValue: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  demoNote: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: spacing.sm },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  paymentNotice: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  paymentNoticeTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  paymentNoticeText: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 18 },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ledgerLeft: { flex: 1, marginRight: spacing.sm },
  ledgerDesc: { fontSize: 14, color: colors.text, fontWeight: '500' },
  ledgerDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  ledgerAmount: { fontSize: 15, fontWeight: '700' },
  credit: { color: colors.success },
  debit: { color: colors.error },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
