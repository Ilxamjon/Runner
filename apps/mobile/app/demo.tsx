import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';

type DemoJob = {
  id: string;
  title: string;
  company: string;
  city: string;
  salary: string;
  type: string;
  description: string;
};

const initialJobs: DemoJob[] = [
  { id: '1', title: 'Sotuvchi-konsultant', company: 'Nukus Market', city: 'Nukus', salary: '3–5 mln soʻm', type: 'Toʻliq ish kuni', description: 'Mijozlarga yordam berish, mahsulotlarni tartibga solish va savdo zalini nazorat qilish.' },
  { id: '2', title: 'SMM yordamchisi', company: 'Qaraqalpaq Media', city: 'Nukus', salary: '2–4 mln soʻm', type: 'Yarim kun', description: 'Ijtimoiy tarmoqlar uchun postlar tayyorlash va kontent rejasini yuritish.' },
  { id: '3', title: 'Yetkazib beruvchi', company: 'Express Delivery', city: 'Xoʻjayli', salary: 'Kuniga 150–250 ming', type: 'Moslashuvchan', description: 'Buyurtmalarni mijozlarga o‘z vaqtida yetkazish. Transport bo‘yicha kelishiladi.' },
];

const initialTasks = [
  { id: 't1', title: 'Doʻkondan buyurtma olib kelish', location: 'Nukus, markaz', pay: '45 000 soʻm', time: '30–45 daqiqa' },
  { id: 't2', title: 'Kompyuterga dastur oʻrnatish', location: 'Nukus, 12-mavze', pay: '100 000 soʻm', time: 'Taxminan 1 soat' },
  { id: 't3', title: 'Hujjatlarni olib borish', location: 'Xoʻjayli', pay: '60 000 soʻm', time: 'Bugun' },
];

type Tab = 'jobs' | 'tasks' | 'messages' | 'profile';

export default function DemoScreen() {
  const [tab, setTab] = useState<Tab>('jobs');
  const [jobs, setJobs] = useState(initialJobs);
  const [applied, setApplied] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<'uz' | 'ru'>('uz');
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(['Assalomu alaykum! Runner demo versiyasiga xush kelibsiz.']);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSalary, setNewSalary] = useState('');

  const ru = language === 'ru';
  const t = (uz: string, rus: string) => (ru ? rus : uz);
  const filteredJobs = useMemo(
    () => jobs.filter((job) => `${job.title} ${job.company} ${job.city}`.toLowerCase().includes(search.toLowerCase())),
    [jobs, search],
  );

  const createDemoJob = () => {
    if (!newTitle.trim() || !newSalary.trim()) {
      Alert.alert(t('Maʼlumotlarni kiriting', 'Заполните поля'), t('Lavozim va maoshni yozing.', 'Укажите должность и зарплату.'));
      return;
    }
    setJobs((old) => [{ id: `demo-${Date.now()}`, title: newTitle.trim(), company: 'Sizning kompaniyangiz', city: 'Nukus', salary: newSalary.trim(), type: t('Yangi eʼlon', 'Новое объявление'), description: t('Demo rejimida yaratilgan sinov vakansiyasi.', 'Тестовая вакансия, созданная в демо-режиме.') }, ...old]);
    setNewTitle('');
    setNewSalary('');
    setShowNewJob(false);
    setTab('jobs');
    Alert.alert(t('Tayyor!', 'Готово!'), t('Vakansiya demo roʻyxatiga qoʻshildi.', 'Вакансия добавлена в демо-список.'));
  };

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logo}><Text style={styles.logoText}>R</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Runner</Text>
          <Text style={styles.subtitle}>{t('Ish va yaqin vazifalar', 'Работа и задания рядом')}</Text>
        </View>
        <Pressable style={styles.langButton} onPress={() => setLanguage(ru ? 'uz' : 'ru')}>
          <Text style={styles.langText}>{ru ? 'РУС' : 'UZB'}</Text>
        </Pressable>
      </View>
      <View style={styles.demoBanner}>
        <Text style={styles.demoBannerTitle}>{t('DEMO VERSIYA', 'ДЕМО-ВЕРСИЯ')}</Text>
        <Text style={styles.demoBannerText}>{t('Sinov maʼlumotlari. Haqiqiy toʻlovlar amalga oshirilmaydi.', 'Тестовые данные. Реальные платежи не выполняются.')}</Text>
      </View>
    </View>
  );

  const BottomNav = () => {
    const items: { key: Tab; label: string; icon: string }[] = [
      { key: 'jobs', label: t('Ishlar', 'Работа'), icon: '⌕' },
      { key: 'tasks', label: t('Vazifalar', 'Задания'), icon: '✓' },
      { key: 'messages', label: t('Xabarlar', 'Чаты'), icon: '✉' },
      { key: 'profile', label: t('Profil', 'Профиль'), icon: '●' },
    ];
    return <View style={styles.bottomNav}>{items.map((item) => (
      <Pressable key={item.key} style={styles.navItem} onPress={() => setTab(item.key)}>
        <Text style={[styles.navIcon, tab === item.key && styles.navActive]}>{item.icon}</Text>
        <Text style={[styles.navLabel, tab === item.key && styles.navActive]}>{item.label}</Text>
      </Pressable>
    ))}</View>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F8FA" />
      <Header />
      <View style={styles.content}>
        {tab === 'jobs' && (
          <View style={{ flex: 1 }}>
            <View style={styles.sectionHeading}>
              <View><Text style={styles.h1}>{t('Ish toping', 'Найдите работу')}</Text><Text style={styles.muted}>{t('Sizga mos imkoniyatlar', 'Возможности для вас')}</Text></View>
              {role === 'employer' && <Pressable style={styles.smallPrimary} onPress={() => setShowNewJob(!showNewJob)}><Text style={styles.primaryText}>+ {t('Eʼlon', 'Объявить')}</Text></Pressable>}
            </View>
            {showNewJob && <View style={styles.formCard}>
              <Text style={styles.cardTitle}>{t('Yangi vakansiya', 'Новая вакансия')}</Text>
              <TextInput value={newTitle} onChangeText={setNewTitle} placeholder={t('Lavozim nomi', 'Название должности')} style={styles.input} />
              <TextInput value={newSalary} onChangeText={setNewSalary} placeholder={t('Maosh (masalan, 3 mln soʻm)', 'Зарплата (например, 3 млн сум)')} style={styles.input} />
              <Pressable style={styles.primaryButton} onPress={createDemoJob}><Text style={styles.primaryText}>{t('Demo eʼlonni saqlash', 'Сохранить демо-объявление')}</Text></Pressable>
            </View>}
            <TextInput value={search} onChangeText={setSearch} placeholder={t('Lavozim yoki shaharni qidiring', 'Поиск должности или города')} style={styles.search} />
            <FlatList data={filteredJobs} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingBottom: 16 }} ListEmptyComponent={<Text style={styles.muted}>{t('Hech narsa topilmadi.', 'Ничего не найдено.')}</Text>} renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}><View style={styles.avatar}><Text style={styles.avatarText}>{item.company.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.company}>{item.company}</Text></View><Text style={styles.badge}>{t('Yangi', 'Новое')}</Text></View>
                <Text style={styles.salary}>{item.salary}</Text>
                <Text style={styles.muted}>{item.city}  ·  {item.type}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <Pressable style={[styles.primaryButton, applied.includes(item.id) && styles.successButton]} onPress={() => {
                  if (applied.includes(item.id)) return;
                  setApplied((old) => [...old, item.id]);
                  Alert.alert(t('Ariza yuborildi', 'Заявка отправлена'), t('Bu faqat demo holati — maʼlumotlar serverga yuborilmadi.', 'Это демо — данные не отправлены на сервер.'));
                }}><Text style={styles.primaryText}>{applied.includes(item.id) ? t('✓ Ariza yuborildi', '✓ Заявка отправлена') : t('Ariza yuborish', 'Откликнуться')}</Text></Pressable>
              </View>
            )} />
          </View>
        )}

        {tab === 'tasks' && <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          <Text style={styles.h1}>{t('Yaqin vazifalar', 'Задания рядом')}</Text><Text style={styles.muted}>{t('Kichik ishlar va tezkor buyurtmalar', 'Небольшие работы и быстрые заказы')}</Text>
          {initialTasks.map((task) => <View style={styles.card} key={task.id}>
            <View style={styles.cardTop}><View style={styles.taskIcon}><Text style={styles.taskIconText}>↗</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{task.title}</Text><Text style={styles.muted}>{task.location}</Text></View></View>
            <Text style={styles.salary}>{task.pay}</Text><Text style={styles.muted}>{task.time}</Text>
            <Pressable style={[styles.primaryButton, accepted.includes(task.id) && styles.successButton]} onPress={() => {
              if (!accepted.includes(task.id)) setAccepted((old) => [...old, task.id]);
              Alert.alert(t('Demo topshiriq', 'Демо-задание'), t('Topshiriq sinov uchun qabul qilindi. Haqiqiy buyurtma yaratilmagan.', 'Задание принято для теста. Реальный заказ не создан.'));
            }}><Text style={styles.primaryText}>{accepted.includes(task.id) ? t('✓ Qabul qilindi', '✓ Принято') : t('Vazifani qabul qilish', 'Принять задание')}</Text></Pressable>
          </View>)}
        </ScrollView>}

        {tab === 'messages' && <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{t('Xabarlar', 'Сообщения')}</Text><Text style={styles.muted}>{t('Demo suhbat', 'Демо-чат')}</Text>
          <ScrollView style={styles.chatBox} contentContainerStyle={{ gap: 10 }}>{messages.map((m, i) => <View key={i} style={styles.chatBubble}><Text style={styles.chatText}>{m}</Text></View>)}</ScrollView>
          <View style={styles.messageRow}><TextInput value={message} onChangeText={setMessage} placeholder={t('Xabar yozing...', 'Напишите сообщение...')} style={[styles.input, { flex: 1, marginBottom: 0 }]} /><Pressable style={styles.sendButton} onPress={() => { if (message.trim()) { setMessages((old) => [...old, message.trim()]); setMessage(''); } }}><Text style={styles.primaryText}>{t('Yuborish', 'Отправить')}</Text></Pressable></View>
          <Text style={styles.tinyNote}>{t('Xabarlar faqat shu telefonda, demo rejimida saqlanadi.', 'Сообщения хранятся только на этом телефоне в демо-режиме.')}</Text>
        </View>}

        {tab === 'profile' && <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.h1}>{t('Profil', 'Профиль')}</Text>
          <View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>D</Text></View><Text style={styles.profileName}>{t('Demo foydalanuvchi', 'Демо-пользователь')}</Text><Text style={styles.muted}>+998 90 *** ** 00</Text><View style={styles.demoPill}><Text style={styles.demoPillText}>DEMO ACCOUNT</Text></View></View>
          <Text style={styles.cardTitle}>{t('Ilovadan qanday foydalanasiz?', 'Как вы будете использовать приложение?')}</Text>
          <View style={styles.roleRow}><Pressable style={[styles.roleButton, role === 'candidate' && styles.roleSelected]} onPress={() => setRole('candidate')}><Text style={[styles.roleText, role === 'candidate' && styles.roleTextSelected]}>{t('Ish izlovchi', 'Соискатель')}</Text></Pressable><Pressable style={[styles.roleButton, role === 'employer' && styles.roleSelected]} onPress={() => setRole('employer')}><Text style={[styles.roleText, role === 'employer' && styles.roleTextSelected]}>{t('Ish beruvchi', 'Работодатель')}</Text></Pressable></View>
          <View style={styles.statsRow}><View style={styles.statCard}><Text style={styles.statNumber}>{applied.length}</Text><Text style={styles.muted}>{t('Arizalar', 'Отклики')}</Text></View><View style={styles.statCard}><Text style={styles.statNumber}>{accepted.length}</Text><Text style={styles.muted}>{t('Vazifalar', 'Задания')}</Text></View><View style={styles.statCard}><Text style={styles.statNumber}>{jobs.length}</Text><Text style={styles.muted}>{t('Vakansiyalar', 'Вакансии')}</Text></View></View>
          <View style={styles.notice}><Text style={styles.cardTitle}>{t('Demo haqida', 'О демо')}</Text><Text style={styles.description}>{t('Bu versiyada maʼlumotlar namunaviy. SMS, server, xarita va haqiqiy toʻlovlar ulanmagan. Ilovani ko‘rib chiqish va asosiy tugmalarni sinash uchun mo‘ljallangan.', 'В этой версии используются тестовые данные. SMS, сервер, карты и реальные платежи не подключены. Версия предназначена для ознакомления и проверки основных кнопок.')}</Text></View>
        </ScrollView>}
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F8FA' },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, backgroundColor: '#F5F8FA' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  brand: { fontSize: 23, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 1 },
  langButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#E2E8F0', borderRadius: 10 },
  langText: { color: '#0F172A', fontWeight: '800', fontSize: 12 },
  demoBanner: { backgroundColor: '#CCFBF1', borderRadius: 12, padding: 10, marginTop: 12, borderWidth: 1, borderColor: '#99F6E4' },
  demoBannerTitle: { color: '#115E59', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  demoBannerText: { color: '#115E59', fontSize: 12, marginTop: 3 },
  content: { flex: 1, paddingHorizontal: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 10 },
  h1: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  muted: { fontSize: 13, color: '#64748B', marginTop: 3 },
  search: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginVertical: 10, color: '#0F172A' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 15, marginTop: 10, borderWidth: 1, borderColor: '#E8EEF2', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0F766E', fontSize: 18, fontWeight: '900' },
  cardTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  company: { color: '#64748B', fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: '#F1F5F9', color: '#475569', fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, overflow: 'hidden' },
  salary: { color: '#0F766E', fontSize: 17, fontWeight: '900', marginTop: 12 },
  description: { color: '#475569', fontSize: 13, lineHeight: 19, marginTop: 9, marginBottom: 8 },
  primaryButton: { backgroundColor: '#0F766E', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  smallPrimary: { backgroundColor: '#0F766E', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  successButton: { backgroundColor: '#15803D' },
  bottomNav: { flexDirection: 'row', paddingTop: 10, paddingBottom: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { color: '#94A3B8', fontSize: 20, fontWeight: '900' },
  navLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  navActive: { color: '#0F766E' },
  taskIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  taskIconText: { color: '#1D4ED8', fontSize: 21, fontWeight: '900' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A', marginTop: 10 },
  chatBox: { flex: 1, marginTop: 14 },
  chatBubble: { backgroundColor: '#CCFBF1', borderRadius: 14, padding: 12, alignSelf: 'flex-start', maxWidth: '90%' },
  chatText: { color: '#134E4A', fontSize: 14 },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  sendButton: { backgroundColor: '#0F766E', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 11 },
  tinyNote: { color: '#94A3B8', fontSize: 11, marginBottom: 8 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, alignItems: 'center', marginVertical: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  profileAvatar: { width: 66, height: 66, borderRadius: 24, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  profileAvatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  profileName: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  demoPill: { backgroundColor: '#FDE68A', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, marginTop: 10 },
  demoPillText: { color: '#92400E', fontSize: 10, fontWeight: '900' },
  roleRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  roleButton: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 13, borderRadius: 12, alignItems: 'center' },
  roleSelected: { backgroundColor: '#CCFBF1', borderColor: '#0F766E' },
  roleText: { color: '#475569', fontSize: 13, fontWeight: '800' },
  roleTextSelected: { color: '#115E59' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 13, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statNumber: { color: '#0F766E', fontSize: 23, fontWeight: '900' },
  notice: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#BFDBFE' },
});
