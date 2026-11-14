// План: квоты вопросов по книгам и разделам (в сумме ровно 5000).
// Одна книга может давать вопросы в несколько разделов (истории философии),
// но в сумме по книге — от 20 до 80 вопросов.
// [ключ, раздел, квота]
export const PLAN = [
  // 1. Древнерусская мысль и XVIII век — 315
  ['ilarion_slovo', 1, 30],
  ['nil_ustav', 1, 40],
  ['iosif_prosvetitel', 1, 50],
  ['fedotov_svyatye', 1, 70],
  ['radishchev_o_cheloveke', 1, 50],
  ['florovsky_puti', 1, 40],
  ['zenkovsky_istoriya', 1, 15],
  // 2. Чаадаев и славянофилы — 345
  ['chaadaev_pisma', 2, 70],
  ['chaadaev_apologiya', 2, 30],
  ['khomyakov_staroe', 2, 30],
  ['khomyakov_cerkov', 2, 35],
  ['kireevsky_prosveshchenie', 2, 45],
  ['kireevsky_novye_nachala', 2, 40],
  ['aksakov_zapiska', 2, 40],
  ['gogol_vybrannye', 2, 55],
  // 3. Западники, революционная и народническая мысль — 415
  ['belinsky_pismo', 3, 20],
  ['herzen_pisma_priroda', 3, 55],
  ['herzen_s_togo_berega', 3, 60],
  ['chernyshevsky_antrop', 3, 50],
  ['pisarev_realisty', 3, 50],
  ['lavrov_pisma', 3, 60],
  ['bakunin_anarkhiya', 3, 60],
  ['kropotkin_vzaimopomoshch', 3, 60],
  // 4. Почвенничество и консерватизм — 340
  ['danilevsky_rossiya', 4, 80],
  ['strakhov_mir', 4, 60],
  ['leontiev_vizantizm', 4, 60],
  ['leontiev_srednij', 4, 40],
  ['rozanov_legenda', 4, 60],
  ['rozanov_uedinennoe', 4, 40],
  // 5. Достоевский и Толстой — 545
  ['dostoevsky_podpolie', 5, 50],
  ['dostoevsky_besy', 5, 80],
  ['dostoevsky_dnevnik', 5, 80],
  ['dostoevsky_karamazovy', 5, 80],
  ['tolstoy_ispoved', 5, 50],
  ['tolstoy_vera', 5, 55],
  ['tolstoy_carstvo', 5, 75],
  ['merezhkovsky_tolstoy', 5, 75],
  // 6. Академическая философия XIX века — 100
  ['strubetskoy_soznanie', 6, 20],
  ['zenkovsky_istoriya', 6, 30],
  ['lossky_istoriya', 6, 20],
  ['shpet_ocherk', 6, 30],
  // 7. Владимир Соловьёв — 665
  ['solovyov_krizis', 7, 75],
  ['solovyov_nachala', 7, 70],
  ['solovyov_kritika', 7, 75],
  ['solovyov_chteniya', 7, 80],
  ['solovyov_rossiya', 7, 70],
  ['solovyov_smysl_lyubvi', 7, 60],
  ['solovyov_opravdanie', 7, 80],
  ['solovyov_tri_razgovora', 7, 75],
  ['etrubetskoy_umozrenie', 7, 35],
  ['etrubetskoy_smysl', 7, 65],
  // 8. Серебряный век и «Вехи» — 325
  ['vekhi', 8, 80],
  ['iz_glubiny', 8, 70],
  ['perepiska_dvuh_uglov', 8, 35],
  ['shestov_apofeoz', 8, 65],
  ['shestov_afiny', 8, 75],
  // 9. Бердяев — 465
  ['berdyaev_tvorchestvo', 9, 80],
  ['berdyaev_istoriya', 9, 70],
  ['berdyaev_svobodny_duh', 9, 80],
  ['berdyaev_kommunizm', 9, 75],
  ['berdyaev_russkaya_ideya', 9, 80],
  ['berdyaev_samopoznanie', 9, 80],
  // 10. Булгаков и Флоренский — 355
  ['bulgakov_khozyaystvo', 10, 70],
  ['bulgakov_svet', 10, 80],
  ['bulgakov_agnec', 10, 75],
  ['florensky_stolp', 10, 80],
  ['florensky_ikonostas', 10, 50],
  // 11. Франк, Лосский, Ильин — 550
  ['frank_predmet', 11, 75],
  ['frank_dusha', 11, 65],
  ['frank_osnovy', 11, 65],
  ['frank_nepostizhimoe', 11, 80],
  ['ilyin_gegel', 11, 65],
  ['ilyin_soprotivlenie', 11, 70],
  ['ilyin_aksiomy', 11, 70],
  ['vysheslavtsev_eros', 11, 60],
  // 12. Эмиграция и евразийство — 120
  ['ntrubetskoy_evropa', 12, 50],
  ['karsavin_lichnost', 12, 35],
  ['zenkovsky_istoriya', 12, 20],
  ['lossky_istoriya', 12, 15],
  // 13. Русский космизм — 115
  ['fedorov_obshchee_delo', 13, 80],
  ['tsiolkovsky_monizm', 13, 35],
  // 14. Марксизм в России — 140
  ['plekhanov_monizm', 14, 75],
  ['lenin_materializm', 14, 50],
  ['lossky_istoriya', 14, 15],
  // 15. Советская философия — 85
  ['losev_mif', 15, 70],
  ['lossky_istoriya', 15, 15],
  // 16. Историки русской философии — 120
  ['zenkovsky_istoriya', 16, 15],
  ['lossky_istoriya', 16, 15],
  ['shpet_ocherk', 16, 50],
  ['florovsky_puti', 16, 40],
];

// Книги, которые не используются, и почему.
export const EXCLUDED = [
  ['lossky_intuitivizm', 'PDF (Лосский, «Избранное», 1991: «Обоснование интуитивизма» и «Мир как органическое целое»): распознан с ошибками — буквы разбиты пробелами, около 20 тысяч мест. Нужен чистый текст.'],
  ['skovoroda_dialogi', 'PDF (Сковорода, Сочинения, т. 1, 1973): текстовый слой с ошибками распознавания («и» → «п», разбитые слова). Нужен чистый текст.'],
  ['mikhailovsky_progress, yurkevich_serdce, chicherin_nauka, lopatin_zadachi, problemy_idealizma, ern_logos, berdyaev_naznachenie, iskhod_k_vostoku, karsavin_istoriya, vernadsky_mysl, bogdanov_tektologiya', 'не найдены в открытом доступе (см. _README.txt в папке книг)'],
  ['losev_imya, bakhtin_postupok, bakhtin_poetika, ilyenkov_logika, mamardashvili_kartezianskie', 'под авторским правом, файлов нет'],
];
