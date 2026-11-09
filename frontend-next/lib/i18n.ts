'use client';

import { useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'hi';

export const translations = {
  en: {
    // Navigation
    features: 'Features',
    solutions: 'Solutions',
    howItWorks: 'How It Works',
    pricing: 'Pricing',
    trustAndSecurity: 'Trust & Security',
    signIn: 'Sign In',
    tryWorkspace: 'Try Workspace',
    solutionsColleges: 'Colleges & Universities',
    solutionsCollegesDesc: 'Large lecture halls, multiple sections, and semester audit trails.',
    solutionsSchools: 'K-12 Schools',
    solutionsSchoolsDesc: 'Guardian consent workflows, homeroom tracking, minor data protections.',
    solutionsCoaching: 'Coaching & Test Prep',
    solutionsCoachingDesc: 'Flexible batch schedules, drop-in attendance, student portals.',
    contactSales: 'Contact Sales',

    // Landing Hero
    heroEyebrow: 'Faculty-First Classroom AI',
    heroTitle: 'Attendance that keeps faculty in control.',
    heroSubtitle: 'Classroom attendance from one photograph, with an accountable human-in-the-loop review step before records reach the ERP. Never a black-box decision.',
    bookDemo: 'Book a demo',
    seeHowItWorks: 'See how it works',
    tryLiveWorkspace: 'Try live workspace →',
    trustTeacherConfirms: 'Teacher confirms every match',
    trustUnder30Sec: 'Under 30 seconds per lecture',
    trustErpReady: 'ERP-ready CSV export',

    // Mockup
    liveFacultyReview: 'Live Faculty Review',
    room302Header: 'Room 302 • CS-101 Data Structures',
    cameraDetected: 'Wide-angle camera • 48 students detected',
    keyboardHint: 'Press A to accept, X to mark absent, ↵ to commit',
    openReviewScreen: 'Open Review Screen',

    // Workflow
    workflowEyebrow: 'A Clear, Auditable Process',
    workflowTitle: 'Four steps, one accountable record.',
    workflowSubtitle: "Attendance shouldn't take 15 minutes of lecture time or rely on untrustworthy black-box algorithms.",
    step1Title: 'Enrol Roster',
    step1Desc: 'One-time group photo enrolment with guardian consent tracking for minors. Biometric templates are stored as face embeddings.',
    step2Title: 'Capture Photo',
    step2Desc: 'Point classroom IP camera, laptop camera, or mobile phone to capture a wide-angle image of seated students in under 2 seconds.',
    step3Title: 'Faculty Review',
    step3Desc: 'High-confidence matches are flagged AUTO. Uncertain matches are flagged REVIEW. Faculty reviews and confirms in under 30 seconds.',
    step4Title: 'Finalize to ERP',
    step4Desc: 'Session locks with a timestamped audit log. Records immediately sync with institutional ERP/LMS systems with zero manual re-entry.',

    // Comparison
    whyWeBuilt: 'Why We Built ClassSight',
    comparisonTitle: 'The attendance dilemma in modern education.',
    statusQuo: 'The Status Quo',
    statusQuoSubtitle: 'Roll Calls & Black-Box Scanners',
    statusQuo1: '10–15 minutes lost every single lecture calling out names or passing sign-in sheets.',
    statusQuo2: 'Buddy punching and proxy attendance falsifying institutional records.',
    statusQuo3: 'Opaque AI scanners making unchecked errors that alienate students and provoke disputes.',
    statusQuo4: 'No audit trail when a student contests their attendance percentage at exam time.',
    classSightWay: 'The ClassSight Way',
    classSightSubtitle: 'Faculty-in-the-Loop Vision',
    classSight1: 'One 2-second photo captures all present students simultaneously.',
    classSight2: 'Face recognition assists, but the teacher remains the final authority before ERP lock.',
    classSight3: 'Speed review mode lets faculty confirm uncertain matches with 3 keyboard taps.',
    classSight4: 'Complete dispute history & privacy receipt protecting students and institution.',

    // Sandbox
    sandboxEyebrow: 'Interactive Sandbox (D24)',
    sandboxTitle: 'Try the faculty review step right here.',
    sandboxSubtitle: 'Experience how faculty confirms matches. Tap the actions below on synthetic student data.',

    // Auth & Login
    authEyebrow: 'Secure Access',
    loginTitle: 'Sign in to your workspace',
    loginSubtitle: 'Access real-time classroom capture and faculty review queue.',
    usernameLabel: 'Institutional Username or Email',
    passwordLabel: 'Password',
    rememberUsername: 'Remember username only',
    forgotPassword: 'Forgot password?',
    signInButton: 'Sign In',
    signingIn: 'Signing in…',
    noAccount: "Don't have an institution account?",
    createAccount: 'Create an account',
    devHint: 'Local development hint:',
    quickFillDev: 'Quick Fill Dev Credentials',

    // Partial translation note
    partialTranslation: 'Hindi translation is partial',
  },
  hi: {
    // Navigation
    features: 'विशेषताएँ',
    solutions: 'समाधान',
    howItWorks: 'कार्यप्रणाली',
    pricing: 'मूल्य निर्धारण',
    trustAndSecurity: 'सुरक्षा एवं विश्वास',
    signIn: 'साइन इन',
    tryWorkspace: 'वर्कस्पेस आज़माएं',
    solutionsColleges: 'कॉलेज और विश्वविद्यालय',
    solutionsCollegesDesc: 'बड़े व्याख्यान कक्ष, बहु-अनुभाग और सेमेस्टर ऑडिट रिकॉर्ड।',
    solutionsSchools: 'विद्यालय (स्कूल)',
    solutionsSchoolsDesc: 'अभिभावक सहमति कार्यप्रवाह, कक्षा ट्रैकिंग, बाल डेटा सुरक्षा।',
    solutionsCoaching: 'कोचिंग एवं टेस्ट प्रेप',
    solutionsCoachingDesc: 'लचीला बैच शेड्यूल, ड्रॉप-इन उपस्थिति, छात्र पोर्टल।',
    contactSales: 'संपर्क करें',

    // Landing Hero
    heroEyebrow: 'संकाय-नियंत्रित कक्षा एआई',
    heroTitle: 'कक्षा उपस्थिति जो शिक्षकों को रखे पूर्ण नियंत्रण में।',
    heroSubtitle: 'केवल एक तस्वीर से पारदर्शी कक्षा उपस्थिति, ईआरपी में रिकॉर्ड जाने से पहले शिक्षक की आधिकारिक समीक्षा। कभी भी ब्लैक-बॉक्स निर्णय नहीं।',
    bookDemo: 'डेमो बुक करें',
    seeHowItWorks: 'कार्यप्रणाली देखें',
    tryLiveWorkspace: 'लाइव वर्कस्पेस देखें →',
    trustTeacherConfirms: 'शिक्षक हर मिलान की पुष्टि करते हैं',
    trustUnder30Sec: 'प्रति व्याख्यान 30 सेकंड से भी कम',
    trustErpReady: 'ईआरपी-तैयार CSV निर्यात',

    // Mockup
    liveFacultyReview: 'लाइव संकाय समीक्षा',
    room302Header: 'कमरा 302 • डेटा स्ट्रक्चर्स (CS-101)',
    cameraDetected: 'वाइड-एंगल कैमरा • 48 छात्र उपस्थित',
    keyboardHint: 'स्वीकारने के लिए A, अनुपस्थित के लिए X, जमा करने के लिए ↵ दबाएँ',
    openReviewScreen: 'समीक्षा स्क्रीन खोलें',

    // Workflow
    workflowEyebrow: 'पारदर्शी एवं प्रामाणिक प्रक्रिया',
    workflowTitle: 'चार सरल चरण, एक विश्वसनीय रिकॉर्ड।',
    workflowSubtitle: 'उपस्थिति दर्ज करने में व्याख्यान के 15 मिनट बर्बाद नहीं होने चाहिए।',
    step1Title: 'रोस्टर नामांकन',
    step1Desc: 'समूह फोटो द्वारा एक बार का नामांकन, नाबालिगों हेतु अभिभावक सहमति ट्रैकिंग के साथ।',
    step2Title: 'फोटो कैप्चर',
    step2Desc: 'कक्षा के आईपी कैमरे, लैपटॉप अथवा मोबाइल से 2 सेकंड में सभी छात्रों की तस्वीर लें।',
    step3Title: 'संकाय समीक्षा',
    step3Desc: 'उच्च-सटीक पहचान AUTO और अनिश्चित पहचान REVIEW के रूप में चिन्हित होती है। शिक्षक 30 सेकंड में जाँचते हैं।',
    step4Title: 'ईआरपी में लॉक',
    step4Desc: 'सत्र ऑडिट लॉग के साथ सुरक्षित रूप से लॉक होता है और सीधे कॉलेज ईआरपी/एलएमएस में सिंक होता है।',

    // Comparison
    whyWeBuilt: 'हमने क्लाससाइट क्यों बनाया',
    comparisonTitle: 'आधुनिक शिक्षा में उपस्थिति की दुविधा।',
    statusQuo: 'पारंपरिक व्यवस्था',
    statusQuoSubtitle: 'रोल कॉल एवं ब्लैक-बॉक्स बायोमेट्रिक्स',
    statusQuo1: 'नाम पुकारने या शीट भरवाने में हर लेक्चर में 10-15 मिनट की बर्बादी।',
    statusQuo2: 'मित्रों द्वारा फर्जी प्रॉक्सी अटेंडेंस लगाना।',
    statusQuo3: 'त्रुटिपूर्ण स्वचालित एआई स्कैनर जो छात्रों में विवाद पैदा करते हैं।',
    statusQuo4: 'परीक्षा के समय छात्र द्वारा उपस्थिति को चुनौती देने पर कोई सबूत नहीं।',
    classSightWay: 'क्लाससाइट प्रणाली',
    classSightSubtitle: 'मानव-समीक्षित विज़न तकनीक',
    classSight1: 'एक 2-सेकंड की फोटो से सभी उपस्थित छात्र एक साथ दर्ज।',
    classSight2: 'एआई सहायता करता है, पर अंतिम अधिकार शिक्षक के हाथ में रहता है।',
    classSight3: 'कीबोर्ड स्पीड मोड से शिक्षक कुछ ही सेकंड में अनिश्चित चेहरों को मंजूरी देते हैं।',
    classSight4: 'पूर्ण विवाद इतिहास और प्राइवेसी रसीद दोनों पक्षों की रक्षा करती है।',

    // Sandbox
    sandboxEyebrow: 'इंटरैक्टिव सैंडबॉक्स (D24)',
    sandboxTitle: 'संकाय समीक्षा चरण को यहीं आज़माएँ।',
    sandboxSubtitle: 'देखें शिक्षक कैसे मिलान की पुष्टि करते हैं। नीचे दिए गए बटनों पर क्लिक करें।',

    // Auth & Login
    authEyebrow: 'सुरक्षित प्रवेश',
    loginTitle: 'अपने वर्कस्पेस में साइन इन करें',
    loginSubtitle: 'रीयल-टाइम कक्षा उपस्थिति और शिक्षक समीक्षा कतार तक पहुंचें।',
    usernameLabel: 'संस्थान उपयोगकर्ता नाम या ईमेल',
    passwordLabel: 'पासवर्ड',
    rememberUsername: 'केवल उपयोगकर्ता नाम याद रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    signInButton: 'साइन इन करें',
    signingIn: 'साइन इन हो रहा है…',
    noAccount: 'संस्थान खाता नहीं है?',
    createAccount: 'खाता बनाएं',
    devHint: 'स्थानीय विकास संकेत:',
    quickFillDev: 'डेमो शिक्षक क्रेडेंशियल्स भरें',

    // Partial translation note
    partialTranslation: 'हिन्दी अनुवाद आंशिक है (Hindi translation is partial)',
  },
};

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem('classsight-lang');
    if (stored === 'hi' || stored === 'en') return stored;
  } catch {}
  return 'en';
}

export function setLanguage(lang: Language) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('classsight-lang', lang);
    window.dispatchEvent(new CustomEvent('classsight-lang-change', { detail: lang }));
  } catch {}
}

export function useI18n() {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    setLangState(getLanguage());
    const onLangChange = (e: Event) => {
      const custom = e as CustomEvent<Language>;
      if (custom.detail) setLangState(custom.detail);
      else setLangState(getLanguage());
    };
    window.addEventListener('classsight-lang-change', onLangChange);
    return () => window.removeEventListener('classsight-lang-change', onLangChange);
  }, []);

  const switchLang = useCallback((newLang: Language) => {
    setLanguage(newLang);
    setLangState(newLang);
  }, []);

  const t = useCallback((key: keyof typeof translations.en) => {
    return translations[lang][key] || translations.en[key] || key;
  }, [lang]);

  return { lang, switchLang, t };
}

