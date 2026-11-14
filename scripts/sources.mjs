// Реестр книг: ключ (имя файла books/<ключ>.txt) → автор, название, год, ссылка.
// В вопросе источник указывается строкой
//   @ ключ ~ точная цитата из книги | Автор. Название, глава
// Сборка проверяет, что цитата есть в books/<ключ>.txt, а подпись начинается с фамилии автора.
// section — раздел теста по умолчанию для вопросов по этой книге.

export const SOURCES = {
  // 1. Древнерусская мысль и XVIII век
  ilarion_slovo: { author: 'Иларион Киевский', title: 'Слово о Законе и Благодати', year: 'ок. 1049', section: 1, url: 'https://azbyka.ru/otechnik/Ilarion_Kievskij/slovo_o_zakone_i_blagodati/' },
  nil_ustav: { author: 'Нил Сорский', title: 'Устав о скитской жизни', year: 'кон. XV — нач. XVI в.', section: 1, url: 'https://azbyka.ru/otechnik/Nil_Sorskij/ustav-prepodobnogo-nila-sorskogo/' },
  iosif_prosvetitel: { author: 'Иосиф Волоцкий', title: 'Просветитель', year: 'нач. XVI в.', section: 1, url: 'https://azbyka.ru/otechnik/Iosif_Volotskij/prosvetitel/' },
  radishchev_o_cheloveke: { author: 'А. Н. Радищев', title: 'О человеке, о его смертности и бессмертии', year: '1792', section: 1, url: '' },
  fedotov_svyatye: { author: 'Г. П. Федотов', title: 'Святые Древней Руси', year: '1931', section: 1, url: 'https://azbyka.ru/otechnik/Georgij_Fedotov/svjatye-drevnej-rusi/' },

  // 2. Чаадаев и славянофилы
  chaadaev_pisma: { author: 'П. Я. Чаадаев', title: 'Философические письма', year: '1829–1831', section: 2, url: 'http://www.vehi.net/chaadaev/filpisma.html' },
  chaadaev_apologiya: { author: 'П. Я. Чаадаев', title: 'Апология сумасшедшего', year: '1837', section: 2, url: 'http://www.vehi.net/chaadaev/apologiya.html' },
  khomyakov_staroe: { author: 'А. С. Хомяков', title: 'О старом и новом', year: '1839', section: 2, url: 'http://az.lib.ru/h/homjakow_a_s/text_1839_o_starom_i_novom.shtml' },
  khomyakov_cerkov: { author: 'А. С. Хомяков', title: 'Церковь одна', year: '1840-е', section: 2, url: 'http://www.vehi.net/khomyakov/cerkov.html' },
  kireevsky_prosveshchenie: { author: 'И. В. Киреевский', title: 'О характере просвещения Европы и о его отношении к просвещению России', year: '1852', section: 2, url: 'https://azbyka.ru/otechnik/Ivan_Kireevskij/o-haraktere-prosveshenija-evropy-i-o-ego-otnoshenii-k-prosvesheniyu-rossii/' },
  kireevsky_novye_nachala: { author: 'И. В. Киреевский', title: 'О необходимости и возможности новых начал для философии', year: '1856', section: 2, url: 'https://azbyka.ru/otechnik/Ivan_Kireevskij/o-neobhodimosti-i-vozmozhnosti-novyh-nachal-dlja-filosofii/' },
  aksakov_zapiska: { author: 'К. С. Аксаков', title: 'О внутреннем состоянии России', year: '1855', section: 2, url: 'http://az.lib.ru/a/aksakow_k_s/text_1855_zapiska.shtml' },
  gogol_vybrannye: { author: 'Н. В. Гоголь', title: 'Выбранные места из переписки с друзьями', year: '1847', section: 2, url: 'http://az.lib.ru/g/gogolx_n_w/text_0160.shtml' },

  // 3. Западники, революционная и народническая мысль
  belinsky_pismo: { author: 'В. Г. Белинский', title: 'Письмо к Гоголю', year: '1847', section: 3, url: 'http://az.lib.ru/b/belinskij_w_g/text_0040.shtml' },
  herzen_pisma_priroda: { author: 'А. И. Герцен', title: 'Письма об изучении природы', year: '1845–1846', section: 3, url: 'http://az.lib.ru/g/gercen_a_i/text_0400-1.shtml' },
  herzen_s_togo_berega: { author: 'А. И. Герцен', title: 'С того берега', year: '1847–1850', section: 3, url: 'http://az.lib.ru/g/gercen_a_i/text_0430.shtml' },
  chernyshevsky_antrop: { author: 'Н. Г. Чернышевский', title: 'Антропологический принцип в философии', year: '1860', section: 3, url: 'http://az.lib.ru/c/chernyshewskij_n_g/text_0430.shtml' },
  pisarev_realisty: { author: 'Д. И. Писарев', title: 'Реалисты', year: '1864', section: 3, url: 'http://az.lib.ru/p/pisarew_d/text_0350.shtml' },
  lavrov_pisma: { author: 'П. Л. Лавров', title: 'Исторические письма', year: '1868–1869', section: 3, url: 'http://az.lib.ru/l/lawrow_p_l/text_1869_istoricheskie_pisma.shtml' },
  bakunin_anarkhiya: { author: 'М. А. Бакунин', title: 'Государственность и анархия', year: '1873', section: 3, url: 'http://az.lib.ru/b/bakunin_m_a/text_0050.shtml' },
  kropotkin_vzaimopomoshch: { author: 'П. А. Кропоткин', title: 'Взаимная помощь как фактор эволюции', year: '1902', section: 3, url: 'https://ru.wikisource.org/wiki/Взаимная_помощь_как_фактор_эволюции_(Кропоткин_1907)' },

  // 4. Почвенничество и консерватизм
  danilevsky_rossiya: { author: 'Н. Я. Данилевский', title: 'Россия и Европа', year: '1869', section: 4, url: 'http://www.vehi.net/danilevsky/rossiya/index.html' },
  strakhov_mir: { author: 'Н. Н. Страхов', title: 'Мир как целое', year: '1872', section: 4, url: 'http://az.lib.ru/s/strahow_n_n/text_1872_mir_kak_tzeloe.shtml' },
  leontiev_vizantizm: { author: 'К. Н. Леонтьев', title: 'Византизм и славянство', year: '1875', section: 4, url: 'https://azbyka.ru/otechnik/Konstantin_Leontev/vizantizm-i-slavjanstvo/' },
  leontiev_srednij: { author: 'К. Н. Леонтьев', title: 'Средний европеец как идеал и орудие всемирного разрушения', year: '1872–1884', section: 4, url: 'https://azbyka.ru/otechnik/Konstantin_Leontev/srednij-evropeets-kak-orudie-vsemirnogo-razrushenija/' },
  rozanov_legenda: { author: 'В. В. Розанов', title: 'Легенда о Великом инквизиторе Ф. М. Достоевского', year: '1891', section: 4, url: 'http://www.vehi.net/rozanov/legenda.html' },
  rozanov_uedinennoe: { author: 'В. В. Розанов', title: 'Уединённое', year: '1912', section: 4, url: 'http://www.vehi.net/rozanov/uedin.html' },

  // 5. Достоевский и Толстой
  dostoevsky_podpolie: { author: 'Ф. М. Достоевский', title: 'Записки из подполья', year: '1864', section: 5, url: 'http://az.lib.ru/d/dostoewskij_f_m/text_0290.shtml' },
  dostoevsky_besy: { author: 'Ф. М. Достоевский', title: 'Бесы', year: '1871–1872', section: 5, url: 'http://az.lib.ru/d/dostoewskij_f_m/text_0080.shtml' },
  dostoevsky_dnevnik: { author: 'Ф. М. Достоевский', title: 'Дневник писателя', year: '1873–1881', section: 5, url: 'http://az.lib.ru/d/dostoewskij_f_m/text_0470.shtml' },
  dostoevsky_karamazovy: { author: 'Ф. М. Достоевский', title: 'Братья Карамазовы', year: '1879–1880', section: 5, url: 'http://az.lib.ru/d/dostoewskij_f_m/text_0100.shtml' },
  tolstoy_ispoved: { author: 'Л. Н. Толстой', title: 'Исповедь', year: '1882', section: 5, url: 'http://az.lib.ru/t/tolstoj_lew_nikolaewich/text_0440.shtml' },
  tolstoy_vera: { author: 'Л. Н. Толстой', title: 'В чём моя вера?', year: '1884', section: 5, url: 'http://az.lib.ru/t/tolstoj_lew_nikolaewich/text_0152.shtml' },
  tolstoy_carstvo: { author: 'Л. Н. Толстой', title: 'Царство Божие внутри вас', year: '1893', section: 5, url: 'http://az.lib.ru/t/tolstoj_lew_nikolaewich/text_1260.shtml' },
  merezhkovsky_tolstoy: { author: 'Д. С. Мережковский', title: 'Л. Толстой и Достоевский', year: '1900–1902', section: 5, url: 'http://az.lib.ru/m/merezhkowskij_d_s/text_1902_tolstoy_i_dostoevsky.shtml' },

  // 6. Академическая философия XIX века
  strubetskoy_soznanie: { author: 'С. Н. Трубецкой', title: 'О природе человеческого сознания', year: '1889–1891', section: 6, url: 'http://az.lib.ru/t/trubeckoj_s_n/text_1891_o_prirode.shtml' },

  // 7. Владимир Соловьёв
  solovyov_krizis: { author: 'В. С. Соловьёв', title: 'Кризис западной философии (против позитивистов)', year: '1874', section: 7, url: 'http://az.lib.ru/s/solowxew_wladimir_sergeewich/text_1874_krizis.shtml' },
  solovyov_nachala: { author: 'В. С. Соловьёв', title: 'Философские начала цельного знания', year: '1877', section: 7, url: 'https://azbyka.ru/otechnik/Vladimir_Solovev/filosofskie-nachala-tselnogo-znanija/' },
  solovyov_kritika: { author: 'В. С. Соловьёв', title: 'Критика отвлечённых начал', year: '1877–1880', section: 7, url: '' },
  solovyov_chteniya: { author: 'В. С. Соловьёв', title: 'Чтения о Богочеловечестве', year: '1878–1881', section: 7, url: 'https://azbyka.ru/otechnik/Vladimir_Solovev/chtenija-o-bogochelovechestve/' },
  solovyov_rossiya: { author: 'В. С. Соловьёв', title: 'Россия и Вселенская Церковь', year: '1889', section: 7, url: 'http://www.vehi.net/soloviev/vselcerk/index.html' },
  solovyov_smysl_lyubvi: { author: 'В. С. Соловьёв', title: 'Смысл любви', year: '1892–1894', section: 7, url: 'https://azbyka.ru/otechnik/Vladimir_Solovev/smysl-lyubvi/' },
  solovyov_opravdanie: { author: 'В. С. Соловьёв', title: 'Оправдание добра', year: '1897', section: 7, url: 'https://azbyka.ru/otechnik/Vladimir_Solovev/opravdanie-dobra-nravstvennaja-filosofija/' },
  solovyov_tri_razgovora: { author: 'В. С. Соловьёв', title: 'Три разговора о войне, прогрессе и конце всемирной истории', year: '1900', section: 7, url: 'http://www.vehi.net/soloviev/trirazgov/index.html' },
  etrubetskoy_umozrenie: { author: 'Е. Н. Трубецкой', title: 'Умозрение в красках', year: '1915', section: 7, url: 'http://www.vehi.net/etrubeckoi/umozrenie.html' },
  etrubetskoy_smysl: { author: 'Е. Н. Трубецкой', title: 'Смысл жизни', year: '1918', section: 7, url: 'http://www.vehi.net/etrubeckoi/smysl_zhizni/index.html' },

  // 8. Серебряный век и «Вехи»
  vekhi: { author: 'Сборник', title: 'Вехи', year: '1909', section: 8, url: 'http://www.vehi.net/vehi/index.html' },
  iz_glubiny: { author: 'Сборник', title: 'Из глубины', year: '1918', section: 8, url: 'http://www.vehi.net/deprofundis/index.html' },
  perepiska_dvuh_uglov: { author: 'Вяч. И. Иванов, М. О. Гершензон', title: 'Переписка из двух углов', year: '1921', section: 8, url: 'http://az.lib.ru/i/iwanow_w_i/text_0150.shtml' },
  shestov_apofeoz: { author: 'Л. Шестов', title: 'Апофеоз беспочвенности', year: '1905', section: 8, url: 'http://www.vehi.net/shestov/apof1.html' },
  shestov_afiny: { author: 'Л. Шестов', title: 'Афины и Иерусалим', year: '1938', section: 8, url: '' },

  // 9. Бердяев
  berdyaev_tvorchestvo: { author: 'Н. А. Бердяев', title: 'Смысл творчества', year: '1916', section: 9, url: 'http://www.vehi.net/berdyaev/tvorch/index.html' },
  berdyaev_istoriya: { author: 'Н. А. Бердяев', title: 'Смысл истории', year: '1923', section: 9, url: 'http://az.lib.ru/b/berdjaew_n_a/text_1920_smysl_istorii.shtml' },
  berdyaev_svobodny_duh: { author: 'Н. А. Бердяев', title: 'Философия свободного духа', year: '1927–1928', section: 9, url: 'http://www.vehi.net/berdyaev/fsduha/index.html' },
  berdyaev_kommunizm: { author: 'Н. А. Бердяев', title: 'Истоки и смысл русского коммунизма', year: '1937', section: 9, url: 'http://www.vehi.net/berdyaev/istoki/index.html' },
  berdyaev_russkaya_ideya: { author: 'Н. А. Бердяев', title: 'Русская идея', year: '1946', section: 9, url: 'http://az.lib.ru/b/berdjaew_n_a/text_1948.shtml' },
  berdyaev_samopoznanie: { author: 'Н. А. Бердяев', title: 'Самопознание', year: '1949', section: 9, url: 'http://www.vehi.net/berdyaev/samopoznanie/index.html' },

  // 10. Булгаков и Флоренский
  bulgakov_khozyaystvo: { author: 'С. Н. Булгаков', title: 'Философия хозяйства', year: '1912', section: 10, url: 'https://azbyka.ru/otechnik/Sergij_Bulgakov/filosofija-hozjajstva/' },
  bulgakov_svet: { author: 'С. Н. Булгаков', title: 'Свет невечерний', year: '1917', section: 10, url: 'http://www.vehi.net/bulgakov/svet/index.html' },
  bulgakov_agnec: { author: 'С. Н. Булгаков', title: 'Агнец Божий', year: '1933', section: 10, url: 'https://azbyka.ru/otechnik/Sergij_Bulgakov/agnets-bozhij-o-bogochelovechestve-chast-1/' },
  florensky_stolp: { author: 'П. А. Флоренский', title: 'Столп и утверждение Истины', year: '1914', section: 10, url: 'https://azbyka.ru/otechnik/Pavel_Florenskij/stolp-i-utverzhdenie-istiny/' },
  florensky_ikonostas: { author: 'П. А. Флоренский', title: 'Иконостас', year: '1922', section: 10, url: 'https://azbyka.ru/otechnik/Pavel_Florenskij/ikonostas/' },

  // 11. Франк, Лосский, Ильин
  frank_predmet: { author: 'С. Л. Франк', title: 'Предмет знания', year: '1915', section: 11, url: 'https://azbyka.ru/otechnik/Semen_Frank/predmet-znanija/' },
  frank_dusha: { author: 'С. Л. Франк', title: 'Душа человека', year: '1917', section: 11, url: 'https://azbyka.ru/otechnik/Semen_Frank/dusha-cheloveka-opyt-vvedenija-v-filosofskuyu-psihologiyu/' },
  frank_osnovy: { author: 'С. Л. Франк', title: 'Духовные основы общества', year: '1930', section: 11, url: 'https://azbyka.ru/otechnik/Semen_Frank/duhovnye-osnovy-obshestva/' },
  frank_nepostizhimoe: { author: 'С. Л. Франк', title: 'Непостижимое', year: '1939', section: 11, url: 'https://azbyka.ru/otechnik/Semen_Frank/nepostizhimoe/' },
  ilyin_gegel: { author: 'И. А. Ильин', title: 'Философия Гегеля как учение о конкретности Бога и человека', year: '1918', section: 11, url: 'https://azbyka.ru/otechnik/Ivan_Ilin/filosofija-gegelja-kak-uchenie-o-konkretnosti-boga-i-cheloveka/' },
  ilyin_soprotivlenie: { author: 'И. А. Ильин', title: 'О сопротивлении злу силою', year: '1925', section: 11, url: 'https://azbyka.ru/otechnik/Ivan_Ilin/o-soprotivlenii-zlu-siloyu/' },
  ilyin_aksiomy: { author: 'И. А. Ильин', title: 'Аксиомы религиозного опыта', year: '1953', section: 11, url: 'https://azbyka.ru/otechnik/Ivan_Ilin/aksiomy-religioznogo-opyta/' },
  vysheslavtsev_eros: { author: 'Б. П. Вышеславцев', title: 'Этика преображённого Эроса', year: '1931', section: 11, url: 'http://az.lib.ru/w/wysheslawcew_b_p/text_1931_etika.shtml' },

  // 12. Эмиграция и евразийство
  ntrubetskoy_evropa: { author: 'Н. С. Трубецкой', title: 'Европа и человечество', year: '1920', section: 12, url: 'http://az.lib.ru/t/trubeckoj_n_s/text_1920_evropa.shtml' },
  karsavin_lichnost: { author: 'Л. П. Карсавин', title: 'О личности', year: '1929', section: 12, url: '' },
  losev_mif: { author: 'А. Ф. Лосев', title: 'Диалектика мифа', year: '1930', section: 15, url: 'https://azbyka.ru/otechnik/Aleksej_Losev/dialektika-mifa/' },

  // 13. Русский космизм
  fedorov_obshchee_delo: { author: 'Н. Ф. Фёдоров', title: 'Философия общего дела', year: '1906–1913', section: 13, url: 'http://az.lib.ru/f/fedorow_n_f/' },
  tsiolkovsky_monizm: { author: 'К. Э. Циолковский', title: 'Монизм Вселенной', year: '1925', section: 13, url: 'https://ru.wikisource.org/wiki/Монизм_Вселенной_(Циолковский)' },

  // 14. Марксизм в России
  plekhanov_monizm: { author: 'Г. В. Плеханов', title: 'К вопросу о развитии монистического взгляда на историю', year: '1895', section: 14, url: '' },
  lenin_materializm: { author: 'В. И. Ленин', title: 'Материализм и эмпириокритицизм', year: '1909', section: 14, url: 'https://ru.wikisource.org/wiki/Материализм_и_эмпириокритицизм_(Ленин)' },

  // 16. Историки русской философии
  florovsky_puti: { author: 'Г. В. Флоровский', title: 'Пути русского богословия', year: '1937', section: 16, url: 'https://azbyka.ru/otechnik/Georgij_Florovskij/puti-russkogo-bogoslovija/' },
  zenkovsky_istoriya: { author: 'В. В. Зеньковский', title: 'История русской философии', year: '1948–1950', section: 16, url: 'https://azbyka.ru/otechnik/Vasilij_Zenkovskij/istorija-russkoj-filosofii/' },
  lossky_istoriya: { author: 'Н. О. Лосский', title: 'История русской философии', year: '1951', section: 16, url: 'http://www.vehi.net/nlossky/istoriya/index.html' },
  shpet_ocherk: { author: 'Г. Г. Шпет', title: 'Очерк развития русской философии', year: '1922', section: 16, url: '' },
};
