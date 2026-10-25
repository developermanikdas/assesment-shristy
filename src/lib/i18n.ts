export type Language = 'en' | 'hi';

export const translations = {
  en: {
    appTitle: 'RBI Grade B Baseline Assessment',
    diagnosticSubtitle: 'Comprehensive Diagnostic & Learning Strategy Map',
    mentorNotice: 'Diagnostic evaluation for study roadmap planning. No pass/fail score.',
    privacyNote: 'Integrity events & activity logs are for learning insights only, never punitive.',
    
    // Actions & Buttons
    next: 'Next',
    previous: 'Previous',
    back: 'Back',
    skip: 'Skip',
    clear: 'Clear',
    markForReview: 'Mark for Review',
    unmarkReview: 'Unmark Review',
    submitSection: 'Submit Section',
    confirmSubmit: 'Yes, Submit Section',
    cancel: 'Cancel',
    reviewAnswers: 'Review Answers',
    saveAndContinue: 'Save & Continue',
    startExam: 'Start Assessment',
    resumeExam: 'Resume Assessment',
    saved: 'Saved',
    saving: 'Saving...',
    offlineSaved: 'Saved offline (will sync)',
    
    // Confidence tags
    confidenceTitle: 'How confident are you in this answer?',
    sure: 'Sure',
    maybe: 'Maybe',
    guess: 'Guess',
    optionalConfidence: 'Optional confidence tag',
    
    // Exam mode elements
    question: 'Question',
    of: 'of',
    timeRemaining: 'Time Left',
    sectionTimeRemaining: 'Section Time',
    bufferAvailable: 'Pooled Buffer Available',
    useBuffer: 'Use Buffer Time',
    stopBuffer: 'Stop Buffer & Submit',
    bufferActive: 'Using Pooled Buffer Time',
    markingScheme: 'Marking: +1 for correct, −0.25 for incorrect',
    notepadTitle: 'Rough Work Notepad',
    notepadPlaceholder: 'Type your calculations, formulas, or rough notes here (auto-saved)...',
    
    // Palette
    paletteTitle: 'Question Palette',
    answered: 'Answered',
    unanswered: 'Unanswered',
    marked: 'Marked for Review',
    
    // Section review modal
    reviewTitle: 'Section Summary & Confirmation',
    totalQuestions: 'Total Questions',
    attemptedCount: 'Answered',
    unattemptedCount: 'Not Answered',
    markedCount: 'Marked for Review',
    reviewWarning: 'Once submitted, this section will be locked and cannot be revisited.',
    
    // Breaks
    breakTitle: 'Scheduled Rest Break',
    breakDesc: 'Take a sip of water, stretch, and relax your eyes.',
    breakRemaining: 'Break Time Remaining',
    resumeEarly: 'Resume Exam Early',
    
    // Audio recorder
    recordVoice: 'Record Voice Note',
    recording: 'Recording... Speak now',
    stopRecording: 'Stop Recording',
    reRecord: 'Record Again',
    maxDurationNote: 'Maximum duration: 90 seconds. Skippable.',
    audioRecorded: 'Voice note recorded successfully',
    
    // Writing boxes
    words: 'words',
    wordLimit: 'Target word count',
    writePlaceholder: 'Write your detailed response here...',
    selectPrompt: 'Select one option below to answer:',
    
    // Chat mode
    chatInputPlaceholder: 'Type your answer here...',
    selectOne: 'Select one option:',
    selectMultiple: 'Select all that apply:',
    scaleLow: '1 (Beginner)',
    scaleHigh: '5 (Confident)',
    
    // Finish screen
    completionTitle: 'Assessment Complete! Thank You.',
    completionDesc: 'Your responses have been recorded securely. Your mentor will analyze your cognitive approach, stamina curve, and diagnostic profile to build your personalized 1-year RBI Grade B roadmap.',
    deleteRequest: 'Request Data Deletion',
    deleteRequestSuccess: 'Your deletion request has been logged.',
    
    // PIN entry
    enterPin: 'Enter 6-Digit Access PIN',
    pinHelp: 'Please enter the access PIN provided by your mentor to start or resume.',
    unlock: 'Unlock & Proceed',
    invalidPin: 'Incorrect PIN. Please check and try again.',
  },
  hi: {
    appTitle: 'आरबीआई ग्रेड बी बेसलाइन असेसमेंट',
    diagnosticSubtitle: 'विस्तृत डायग्नोस्टिक एवं अध्ययन रणनीति रोडमैप',
    mentorNotice: 'यह एक डायग्नोस्टिक परीक्षा है, कोई पास/फेल टेस्ट नहीं।',
    privacyNote: 'सभी गतिविधि लॉग केवल आपकी अध्ययन शैली को समझने के लिए हैं, किसी दंड के लिए नहीं।',
    
    next: 'आगे बढ़ें',
    previous: 'पिछला',
    back: 'पीछे जाएं',
    skip: 'छोड़ें (Skip)',
    clear: 'उत्तर हटाएं',
    markForReview: 'समीक्षा के लिए चिह्नित करें',
    unmarkReview: 'चिह्न हटाएं',
    submitSection: 'अनुभाग जमा करें',
    confirmSubmit: 'हाँ, जमा करें',
    cancel: 'रद्द करें',
    reviewAnswers: 'उत्तरों की समीक्षा करें',
    saveAndContinue: 'सहेजें और आगे बढ़ें',
    startExam: 'परीक्षा शुरू करें',
    resumeExam: 'परीक्षा जारी रखें',
    saved: 'सहेजा गया',
    saving: 'सहेज रहे हैं...',
    offlineSaved: 'ऑफ़लाइन सहेजा गया (सिंक होगा)',
    
    confidenceTitle: 'आप इस उत्तर के प्रति कितने आश्वस्त हैं?',
    sure: 'पक्का (Sure)',
    maybe: 'शायद (Maybe)',
    guess: 'अनुमान (Guess)',
    optionalConfidence: 'वैकल्पिक विश्वास टैग',
    
    question: 'प्रश्न',
    of: 'का',
    timeRemaining: 'शेष समय',
    sectionTimeRemaining: 'अनुभाग समय',
    bufferAvailable: 'उपलब्ध बफर समय',
    useBuffer: 'बफर समय का उपयोग करें',
    stopBuffer: 'बफर रोकें और जमा करें',
    bufferActive: 'बफर समय सक्रिय है',
    markingScheme: 'अंकन: सही के लिए +1, गलत के लिए −0.25',
    notepadTitle: 'रफ वर्क नोटपैड',
    notepadPlaceholder: 'अपनी गणना, सूत्र या रफ नोट्स यहाँ लिखें (स्वतः सहेजा जाता है)...',
    
    paletteTitle: 'प्रश्न तालिका (Palette)',
    answered: 'उत्तर दिया',
    unanswered: 'उत्तर नहीं दिया',
    marked: 'समीक्षा हेतु चिह्नित',
    
    reviewTitle: 'अनुभाग सारांश एवं पुष्टि',
    totalQuestions: 'कुल प्रश्न',
    attemptedCount: 'उत्तर दिए गए',
    unattemptedCount: 'अनुत्तरित',
    markedCount: 'समीक्षा हेतु चिह्नित',
    reviewWarning: 'एक बार जमा करने के बाद, यह अनुभाग लॉक हो जाएगा और पुनः नहीं खोला जा सकेगा।',
    
    breakTitle: 'विश्राम अंतराल (Break)',
    breakDesc: 'पानी पिएं, विश्राम करें और अपनी आँखों को आराम दें।',
    breakRemaining: 'विश्राम समय शेष',
    resumeEarly: 'परीक्षा अभी जारी रखें',
    
    recordVoice: 'वॉयस नोट रिकॉर्ड करें',
    recording: 'रिकॉर्डिंग चालू है... बोलें',
    stopRecording: 'रिकॉर्डिंग समाप्त करें',
    reRecord: 'पुनः रिकॉर्ड करें',
    maxDurationNote: 'अधिकतम 90 सेकंड। ऐच्छिक (छोड़ सकते हैं)।',
    audioRecorded: 'वॉयस नोट सफलतापूर्वक रिकॉर्ड हो गया',
    
    words: 'शब्द',
    wordLimit: 'लक्षित शब्द सीमा',
    writePlaceholder: 'अपना विस्तृत उत्तर यहाँ लिखें...',
    selectPrompt: 'उत्तर देने के लिए नीचे एक विकल्प चुनें:',
    
    chatInputPlaceholder: 'अपना उत्तर यहाँ लिखें...',
    selectOne: 'एक विकल्प चुनें:',
    selectMultiple: 'लागू होने वाले सभी विकल्प चुनें:',
    scaleLow: '1 (शुरुआती)',
    scaleHigh: '5 (आत्मविश्वासी)',
    
    completionTitle: 'मूल्यांकन पूर्ण हुआ! धन्यवाद।',
    completionDesc: 'आपके उत्तर सुरक्षित रूप से दर्ज कर लिए गए हैं। आपके मेंटर आपकी अध्ययन क्षमता और समय प्रबंधन का विश्लेषण करके आपका 1-वर्षीय आरबीआई ग्रेड बी रोडमैप तैयार करेंगे।',
    deleteRequest: 'डेटा हटाने का अनुरोध करें',
    deleteRequestSuccess: 'आपका डेटा हटाने का अनुरोध दर्ज कर लिया गया है।',
    
    enterPin: '6-अंकों का एक्सेस पिन दर्ज करें',
    pinHelp: 'परीक्षा शुरू या फिर से जारी रखने के लिए अपने मेंटर द्वारा दिया गया पिन दर्ज करें।',
    unlock: 'अनलॉक करें और आगे बढ़ें',
    invalidPin: 'गलत पिन। कृपया जांचें और पुनः प्रयास करें।',
  },
};
