export type EntryLocale = 'de' | 'en';
export type EntryIntent = {
  id: string;
  world: string;
  title: string;
  description: string;
  href: string;
  action: string;
  alternative: {href: string; label: string};
};

// Existing destinations only. Discovery must work without an account or JavaScript.
export const ENTRY_INTENTS: Record<EntryLocale, readonly EntryIntent[]> = {
  de: [
    {id: 'care', world: 'Pflanzenwissen', title: 'Meine Pflanze braucht Hilfe.', description: 'Erst verstehen, dann handeln: Entdecke Ratgeber zu Standort, Pflege und sichtbaren Problemen.', href: '/blogs', action: 'Ratgeber entdecken', alternative: {href: '/search', label: 'Gezielt suchen'}},
    {id: 'light', world: 'Light Studio', title: 'Ich suche das passende Licht.', description: 'Vom einzelnen Pflanzenplatz bis zum Regal: Licht, Abstand und Montage zusammen betrachten.', href: '/welten/licht', action: 'Lichtwelt entdecken', alternative: {href: '/collections/pflanzenbeleuchtung', label: 'Leuchten ansehen'}},
    {id: 'substrate', world: 'Substrate Lab', title: 'Ich will umtopfen oder selbst mischen.', description: 'Eine kleine Menge f\u00fcr den Anfang oder eine eigene Mischung: Finde deinen Weg zum passenden Substrat.', href: '/collections/substratwelt-pflanzsubstrate-mischungen-zusatze', action: 'Substrate entdecken', alternative: {href: '/products/leafer-substrat-konfigurator', label: 'Mischung konfigurieren'}},
    {id: 'living', world: 'Living & Gef\u00e4\u00dfe', title: 'Ich will meinen Raum begr\u00fcnen.', description: 'Beginne mit einer Ecke. Entdecke Gef\u00e4\u00dfe und Pflanzsysteme, die zu deinem Vorhaben passen.', href: '/welten/gefaesse', action: 'Gef\u00e4\u00dfwelt entdecken', alternative: {href: '/collections/pflanzgefasse', label: 'Gef\u00e4\u00dfe ansehen'}},
    {id: 'grow', world: 'Propagation Lab', title: 'Ich m\u00f6chte auss\u00e4en oder vermehren.', description: 'Ein Samen, ein Steckling, eine neue Idee: Anzucht und das passende Zubeh\u00f6r entdecken.', href: '/welten/anzucht', action: 'Anzuchtwelt entdecken', alternative: {href: '/marken/romberg', label: 'Romberg entdecken'}},
    {id: 'water', world: 'Water Systems', title: 'Ich m\u00f6chte einfacher bew\u00e4ssern.', description: 'Wasser, Gef\u00e4\u00df und Substrat als System betrachten, statt einfach h\u00e4ufiger zu gie\u00dfen.', href: '/welten/bewaesserung', action: 'Bew\u00e4sserung entdecken', alternative: {href: '/marken/blumat', label: 'Blumat entdecken'}},
  ],
  en: [
    {id: 'care', world: 'Plant knowledge', title: 'My plant needs help.', description: 'Understand first, then act: explore guides to location, care and visible plant problems.', href: '/en/blogs', action: 'Explore guides', alternative: {href: '/en/search', label: 'Search a topic'}},
    {id: 'light', world: 'Light Studio', title: 'I need the right light.', description: 'From one plant to a shelf: consider lighting, distance and mounting together.', href: '/en/worlds/light', action: 'Explore lighting', alternative: {href: '/en/collections/pflanzenbeleuchtung', label: 'Browse grow lights'}},
    {id: 'substrate', world: 'Substrate Lab', title: 'I want to repot or mix substrate.', description: 'Start with a small amount or build your own recipe. Find the substrate route that suits your project.', href: '/en/substrate', action: 'Explore substrates', alternative: {href: '/en/products/leafer-substrat-konfigurator', label: 'Configure a mix'}},
    {id: 'living', world: 'Living & Containers', title: 'I want to bring plants into my room.', description: 'Start with one corner. Explore containers and plant systems for your next idea.', href: '/en/worlds/containers', action: 'Explore containers', alternative: {href: '/en/collections/pflanzgefasse', label: 'Browse planters'}},
    {id: 'grow', world: 'Propagation Lab', title: 'I want to sow or propagate.', description: 'A seed, a cutting, a new idea: explore propagation and the equipment to get started.', href: '/en/worlds/propagation', action: 'Explore propagation', alternative: {href: '/en/brands/romberg', label: 'Explore Romberg'}},
    {id: 'water', world: 'Water Systems', title: 'I want to simplify watering.', description: 'Think about water, containers and substrate as a system, rather than simply watering more often.', href: '/en/worlds/water', action: 'Explore watering', alternative: {href: '/en/brands/blumat', label: 'Explore Blumat'}},
  ],
};

export const ENTRY_COPY = {
  de: {
    eyebrow: 'LEAFerservice / Deine Pflanzenwelt', title: 'Kleine Anf\u00e4nge.', titleEnd: 'Gro\u00dfe M\u00f6glichkeiten.',
    intro: 'Eine Pflanze verstehen. Einen Lieblingsplatz gestalten. Oder einfach das richtige Substrat finden. Beginne mit dem, was dich bewegt.',
    explore: 'Meinen Einstieg finden', shop: 'Direkt zum Sortiment', trust: 'Ohne Anmeldung entdecken. Ohne Kaufzwang weiterdenken.',
    imageCaption: 'Pflanzen. Wissen. Neue Perspektiven.', fallback: 'Hier beginnt deine Pflanzenwelt.',
    question: 'Was f\u00fchrt dich heute zu uns?', questionHint: 'W\u00e4hle dein Anliegen. Du entscheidest, wie weit du gehen m\u00f6chtest.',
    step: '01 / Dein Anliegen', details: 'M\u00f6glichkeiten ansehen',
    knowledgeKicker: '02 / Entdecken & verstehen', knowledgeTitle: 'Mehr als sch\u00f6ne Bl\u00e4tter.',
    knowledgeText: 'Wissen geh\u00f6rt dazu. Unsere vorhandenen Artikel und Ratgeber bleiben direkt erreichbar, auch wenn du nichts kaufen m\u00f6chtest.',
    knowledgeAction: 'Alle Ratgeber', articleAction: 'Artikel lesen',
    journeyKicker: 'In deinem Tempo', journeyTitle: 'Heute ein kleiner Anfang. Morgen deine n\u00e4chste Idee.',
    journeyText: 'Du musst nicht gleich einen ganzen Raum planen. Eine beantwortete Frage, ein Ableger oder die passende Mischung ist ein guter Anfang.',
    shortcutTitle: 'Du wei\u00dft schon, was du brauchst?', search: 'Suche \u00f6ffnen',
    faqTitle: 'Kurz gefragt. Klar beantwortet.',
    faqs: [
      {question: 'Muss ich erst diese Auswahl durchlaufen?', answer: 'Nein. Sortiment, Suche, Ratgeber und die einzelnen Welten sind direkt erreichbar. Diese Seite ist eine Orientierung, kein Pflichtschritt.'},
      {question: 'Kann ich ohne Konto und ohne Einkauf starten?', answer: 'Ja. Du kannst dich als Gast informieren und die vorhandenen Werkzeuge ausprobieren. Erst wenn du Produkte bestellst, entstehen daf\u00fcr Kosten.'},
      {question: 'Wo finde ich ausf\u00fchrliche Informationen?', answer: 'In den Ratgebern und Themenwelten. Die kurzen Einstiege ersetzen keine Fachinformationen, sondern f\u00fchren dich dorthin.'},
    ],
  },
  en: {
    eyebrow: 'LEAFerservice / Your plant world', title: 'Small beginnings.', titleEnd: 'More possibilities.',
    intro: 'Understand a plant. Create a favourite corner. Or simply find the right substrate. Start with what matters to you.',
    explore: 'Find my starting point', shop: 'Go straight to the shop', trust: 'Explore without an account. Discover without a purchase.',
    imageCaption: 'Plants. Knowledge. New perspectives.', fallback: 'Your plant world starts here.',
    question: 'What brings you here today?', questionHint: 'Choose your goal. You decide how far to take it.',
    step: '01 / Your starting point', details: 'See your options',
    knowledgeKicker: '02 / Discover & understand', knowledgeTitle: 'More than beautiful leaves.',
    knowledgeText: 'Knowledge belongs here. Our existing articles and guides remain directly accessible, even when you are not looking to buy.',
    knowledgeAction: 'All guides', articleAction: 'Read article',
    journeyKicker: 'At your own pace', journeyTitle: 'A small beginning today. Your next idea tomorrow.',
    journeyText: 'You do not have to plan an entire room. An answered question, a cutting or the right mix is a good place to start.',
    shortcutTitle: 'Already know what you need?', search: 'Open search',
    faqTitle: 'A few useful answers.',
    faqs: [
      {question: 'Do I have to go through this selection?', answer: 'No. Products, search, guides and individual worlds are directly accessible. This page is a starting point, not a gate.'},
      {question: 'Can I start without an account or purchase?', answer: 'Yes. Read and explore the available tools as a guest. Products only incur a charge when you place an order.'},
      {question: 'Where can I find detailed information?', answer: 'In our guides and specialist worlds. These short introductions lead to the information, rather than replacing it.'},
    ],
  },
} as const;
