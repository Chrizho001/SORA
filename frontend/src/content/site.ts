/**
 * Single source of truth for landing-page copy.
 * The brand name is swappable from `site.name`.
 *
 * PLACEHOLDER NOTICE: every number, rating and testimonial below marked
 * `// placeholder` is illustrative. There are no real users yet. Replace
 * before public launch (tracked in DESIGN.md → "Replacement list").
 */

export const site = {
  name: "SORA",
  tagline: "Study smarter, not later.",
  description:
    "SORA turns your lecture PDFs into clear summaries, flashcards and quizzes, and keeps every deadline in one calm place. Free for students.",
  appUrl: "app.sora.study",
  routes: {
    signup: "/signup",
    login: "/login",
    support: "mailto:support@sora.study",
  },
};

export const nav = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Reviews", href: "#reviews" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const heroStats = [
  { value: "45k+", label: ["Students", "studying"], icon: "phone" }, // placeholder
  { value: "320k+", label: ["PDFs", "summarised"], icon: "file" }, // placeholder
  { value: "1.8M+", label: ["Flashcards", "created"], icon: "cards" }, // placeholder
] as const;

export const marqueeQuotes = [
  { quote: "Turned a 60-page reading into 20 cards before my 9am", handle: "@tobi.studies" },
  { quote: "The quiz found the exact topic I kept skipping", handle: "@mei.reads" },
  { quote: "Finally one app instead of five tabs", handle: "@arjun_codes" },
  { quote: "My deadlines stopped sneaking up on me", handle: "@sofia.law" },
  { quote: "Summaries I can actually revise from", handle: "@liam.med" },
  { quote: "Installed it on my phone in ten seconds", handle: "@amara.pharm" },
]; // placeholder

export const proofStats = [
  { value: "50K+", label: "Active students" }, // placeholder
  { value: "1.8M+", label: "Flashcards created" }, // placeholder
  { value: "3.4x", label: "Faster revision prep" }, // placeholder
  { value: "4 min", label: "Avg. summary time" }, // placeholder
];

export const actionChips = [
  "Plain-language summaries",
  "Flashcards from your own notes",
  "Quizzes that find weak spots",
];

export const actionStats = [
  { value: "~4 min", label: "Avg. summary time" }, // placeholder
  { value: "30+", label: "Cards per lecture" }, // placeholder
  { value: "10 MB", label: "PDF upload limit" },
];

export const steps = [
  {
    title: "Drop In Your PDF",
    body: "Upload lecture slides, a paper or this week’s reading. SORA pulls out the text for you.",
    note: "Works with any PDF up to 10 MB",
  },
  {
    title: "SORA Summarises It",
    body: "Your summary builds in the background while you keep working. We’ll ping you the second it’s ready.",
    note: "Turn the summary into flashcards in one tap",
  },
  {
    title: "Revise & Quiz",
    body: "Edit anything the AI made, then quiz yourself and see exactly which answers you got right or wrong.",
    note: "Your score history shows what to revise next",
  },
];

export const featuredReview = {
  quote:
    "“Final year with three modules and a dissertation. SORA turns my lecture slides into summaries and cards the same evening. I went from cramming the night before to revising a little every day, and my grades show it.”",
  name: "Amara Okafor",
  meta: "Pharmacy, Year 4",
  avatar: "/avatars/amara.webp",
  stats: [
    { value: "+31%", label: "exam score", sub: "vs. last semester" },
    { value: "6 hrs", label: "saved per week", sub: "on note-making" },
    { value: "420", label: "cards reviewed", sub: "this month" },
    { value: "14 days", label: "study streak", sub: "and counting" },
  ],
}; // placeholder

export const reviews = [
  {
    name: "Tobi Adeyemi",
    meta: "Computer Science, Year 2",
    avatar: "/avatars/tobi.webp",
    quote:
      "“I used to rewrite my notes by hand for hours. Now I upload the slides, fix two or three cards, and spend that time actually revising.”",
    cards: "1.2k",
    quizzes: "48",
  },
  {
    name: "Mei Lin",
    meta: "Economics, Year 3",
    avatar: "/avatars/mei.webp",
    quote:
      "“The summaries are short without being shallow. I read one on the bus and the key ideas actually stick.”",
    cards: "860",
    quizzes: "31",
  },
  {
    name: "Arjun Mehta",
    meta: "Mechanical Eng., Year 1",
    avatar: "/avatars/arjun.webp",
    quote:
      "“Having tasks and revision in one app is the whole point. The deadline reminders saved my lab report twice.”",
    cards: "540",
    quizzes: "22",
  },
  {
    name: "Sofia Ramos",
    meta: "Law, Year 2",
    avatar: "/avatars/sofia.webp",
    quote:
      "“Case readings are brutal. SORA gets me to the holding and the reasoning fast, then quizzes me until I know it.”",
    cards: "2.1k",
    quizzes: "64",
  },
  {
    name: "Liam Walsh",
    meta: "Medicine, Year 3",
    avatar: "/avatars/liam.webp",
    quote:
      "“The quiz results page is brutally honest. It shows me exactly which cards I keep getting wrong. That’s what I revise.”",
    cards: "3.4k",
    quizzes: "112",
  },
  {
    name: "Omar Haddad",
    meta: "Architecture, Year 4",
    avatar: "/avatars/omar.webp",
    quote:
      "“I installed it to my home screen and it feels like a real app. Opens instantly, even on campus Wi-Fi.”",
    cards: "690",
    quizzes: "19",
  },
]; // placeholder

export const plan = {
  included: [
    "Unlimited tasks & deadline reminders",
    "AI summaries for your PDFs",
    "AI flashcards you can edit",
    "Quizzes with score history",
    "In-app & push notifications",
    "Installs on any phone or laptop",
    "Opens offline (app shell)",
  ],
  next: {
    label: "Coming next",
    title: "Smarter review",
    body: "Ideas we’re building next, based on what students ask for most.",
    items: ["Spaced-repetition scheduling", "Calendar sync", "Study stats export"],
    later: ["Image & slide uploads", "Exam-date planner"],
  },
  horizon: {
    label: "On the horizon",
    title: "Study, your way",
    body: "Longer-term ideas. Tell us which ones matter to you.",
    items: ["Voice-note summaries", "Custom quiz formats", "Dark mode"],
    later: ["Handwriting import", "Offline flashcard review"],
  },
};

export const faqs = [
  {
    q: "How does SORA create my summaries?",
    a: "You upload a PDF and SORA extracts the text, then an AI model writes a structured summary of it. It runs in the background, so you can keep using the app, and you get a notification when it’s ready.",
  },
  {
    q: "Are the flashcards and quizzes based on my own material?",
    a: "Yes. Cards are generated from your summary, not generic content, and you can edit or delete any of them. Quizzes are built from your flashcards, so they test exactly what you’re studying.",
  },
  {
    q: "Can I use SORA on my phone like a normal app?",
    a: "SORA is a web app you can install to your home screen from your browser. It opens full-screen, sends notifications, and loads instantly. There’s no app store download needed.",
  },
  {
    q: "What files can I upload?",
    a: "PDFs up to 10 MB: lecture slides, papers, readings and notes exported as PDF. Other file types aren’t supported yet.",
  },
  {
    q: "Does SORA work offline?",
    a: "The app opens offline so you can get to your stuff anywhere. Making summaries, flashcards and quizzes with AI needs an internet connection.",
  },
  {
    q: "Is SORA really free?",
    a: "Yes. SORA is free for students. There’s no trial, no card details and no paywall.",
  },
  {
    q: "Is my study material private?",
    a: "Your files, summaries and cards are only visible to you. Nothing is shared with other students, and you can delete anything at any time.",
  },
];

export const finalCta = {
  badge: "Install on any device · Free for students",
  notes: [
    { text: "Mitochondria → site of aerobic respiration. ATP made via oxidative phosphorylation.", tag: "BIO 101", meta: "Card 12 / 36" },
    { text: "Opportunity cost: the value of the next best alternative given up.", tag: "ECON 110", meta: "Card 4 / 22" },
    { text: "Ratio decidendi: the legal reasoning essential to the court’s decision.", tag: "LAW 204", meta: "Card 9 / 40" },
    { text: "Ohm’s law: V = I × R. Voltage equals current times resistance.", tag: "PHYS 120", meta: "Card 2 / 18" },
  ],
  stats: [
    { value: "50K+", label: "Active students" }, // placeholder
    { value: "4.9★", label: "Avg. rating" }, // placeholder
    { value: "1.8M+", label: "Cards created" }, // placeholder
  ],
};

export const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Install the app", href: "#top" },
    ],
  },
  {
    title: "Study tools",
    links: [
      { label: "PDF summaries", href: "#features" },
      { label: "Flashcards", href: "#features" },
      { label: "Quizzes", href: "#features" },
      { label: "Task planner", href: "#features" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Contact us", href: "mailto:support@sora.study" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];
